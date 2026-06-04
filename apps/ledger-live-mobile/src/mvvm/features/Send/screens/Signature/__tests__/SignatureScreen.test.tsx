import React from "react";
import { DeviceModelId } from "@ledgerhq/types-devices";
import { fireEvent, render, screen } from "@tests/test-renderer";
import { SignatureScreen } from "../index";
import * as UseSignatureViewModelModule from "../hooks/useSignatureViewModel";

// ─── Mock DeviceAction (heavy device-state-machine component) ────────────────
// We capture the render-prop calls here so each test can inject a specific
// device state (locked, loading, etc.) without running the real RxJS pipeline.
const mockDeviceActionImpl = jest.fn();

jest.mock("~/components/DeviceAction", () => ({
  __esModule: true,
  default: (props: unknown) => mockDeviceActionImpl(props),
}));

// ─── Mock SendFlowLayout (pure layout wrapper, not under test) ───────────────
jest.mock("../../../components/SendFlowLayout", () => ({
  SendFlowLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Mock BluetoothRequirementsDrawer (BLE platform state machine) ───────────
jest.mock("~/components/RequiresBLE/BluetoothRequirementsDrawer", () => ({
  __esModule: true,
  default: () => null,
}));

// ─── Mock InfiniteLoader (@ledgerhq/native-ui is not in jest transformList) ──
jest.mock("~/components/InfiniteLoader", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID ?? "infinite-loader"} />,
  };
});

// ─── Mock useSignatureViewModel ──────────────────────────────────────────────
jest.mock("../hooks/useSignatureViewModel", () => ({
  useSignatureViewModel: jest.fn(),
}));

// ─── Shared test fixtures ────────────────────────────────────────────────────

const mockBleDevice = {
  modelId: DeviceModelId.stax,
  wired: false,
  deviceId: "mock-ble-device",
};

const mockWiredDevice = {
  modelId: DeviceModelId.stax,
  wired: true,
  deviceId: "mock-wired-device",
};

const mockOnRetry = jest.fn();

function buildViewModel(
  overrides: Record<string, unknown> = {},
): ReturnType<typeof UseSignatureViewModelModule.useSignatureViewModel> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    account: { id: "account-1" } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: { family: "bitcoin" } as any,
    device: mockBleDevice,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: {} as any,
    onDeviceActionResult: jest.fn(),
    bluetooth: {
      hasIssue: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bluetoothRequirementsState: "unknown" as any,
      retryRequestOnIssue: jest.fn(),
      cannotRetryRequest: false,
      onDrawerClose: jest.fn(),
    },
    ...overrides,
  } as ReturnType<typeof UseSignatureViewModelModule.useSignatureViewModel>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SignatureScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(UseSignatureViewModelModule.useSignatureViewModel)
      .mockReturnValue(buildViewModel());
    mockDeviceActionImpl.mockReturnValue(null);
  });

  // ── Early-return guards ───────────────────────────────────────────────────

  describe("when required flow data is missing", () => {
    it("should render nothing when account is missing", () => {
      jest
        .mocked(UseSignatureViewModelModule.useSignatureViewModel)
        .mockReturnValue(buildViewModel({ account: null }));
      render(<SignatureScreen />);
      expect(screen.queryByTestId("send-signature-step")).toBeNull();
    });

    it("should render nothing when transaction is missing", () => {
      jest
        .mocked(UseSignatureViewModelModule.useSignatureViewModel)
        .mockReturnValue(buildViewModel({ transaction: null }));
      render(<SignatureScreen />);
      expect(screen.queryByTestId("send-signature-step")).toBeNull();
    });

    it("should render nothing when device is missing", () => {
      jest
        .mocked(UseSignatureViewModelModule.useSignatureViewModel)
        .mockReturnValue(buildViewModel({ device: null }));
      render(<SignatureScreen />);
      expect(screen.queryByTestId("send-signature-step")).toBeNull();
    });
  });

  // ── renderLoading render-prop ─────────────────────────────────────────────

  describe("renderLoading", () => {
    it("should show power-on prompt when BLE device is not yet connected", () => {
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderLoading }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderLoading({ device, connectedDevice: null, isWaitingForAppConnection: false }),
      );

      render(<SignatureScreen />);

      expect(screen.getByTestId("send-signature-title")).toHaveTextContent(
        "Power on and unlock your Ledger Stax",
      );
    });

    it("should show connect-and-unlock prompt when wired device is not connected", () => {
      jest
        .mocked(UseSignatureViewModelModule.useSignatureViewModel)
        .mockReturnValue(buildViewModel({ device: mockWiredDevice }));
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderLoading }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderLoading({ device, connectedDevice: null, isWaitingForAppConnection: false }),
      );

      render(<SignatureScreen />);

      expect(screen.getByTestId("send-signature-title")).toHaveTextContent(
        "Connect and unlock your device",
      );
    });

    it("should show the signature confirmation prompt while waiting for app connection", () => {
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderLoading }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderLoading({
            device,
            connectedDevice: { deviceId: "connected" },
            isWaitingForAppConnection: true,
          }),
      );

      render(<SignatureScreen />);

      expect(screen.getByTestId("send-signature-prompt")).toBeOnTheScreen();
    });

    it("should show a spinner while the device is processing the transaction", () => {
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderLoading }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderLoading({
            device,
            connectedDevice: { deviceId: "connected" },
            isWaitingForAppConnection: false,
          }),
      );

      render(<SignatureScreen />);

      expect(screen.getByTestId("send-signature-loading")).toBeOnTheScreen();
    });
  });

  // ── renderConnectYourDevice render-prop ───────────────────────────────────

  describe("renderConnectYourDevice", () => {
    it("should show unlock prompt with a retry button when device is locked", () => {
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderConnectYourDevice }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderConnectYourDevice({
            device,
            isLocked: true,
            unresponsive: false,
            onRetry: mockOnRetry,
          }),
      );

      render(<SignatureScreen />);

      expect(screen.getByTestId("send-signature-title")).toHaveTextContent("Unlock your device");
      expect(screen.getByText("Retry")).toBeOnTheScreen();
    });

    it("should show unlock prompt without retry button when device is unresponsive", () => {
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderConnectYourDevice }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderConnectYourDevice({
            device,
            isLocked: false,
            unresponsive: true,
            onRetry: mockOnRetry,
          }),
      );

      render(<SignatureScreen />);

      expect(screen.getByTestId("send-signature-title")).toHaveTextContent("Unlock your device");
      expect(screen.queryByText("Retry")).toBeNull();
    });

    it("should show power-on prompt for a disconnected BLE device that is neither locked nor unresponsive", () => {
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderConnectYourDevice }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderConnectYourDevice({
            device,
            isLocked: false,
            unresponsive: false,
            onRetry: mockOnRetry,
          }),
      );

      render(<SignatureScreen />);

      expect(screen.getByTestId("send-signature-title")).toHaveTextContent(
        "Power on and unlock your Ledger Stax",
      );
      expect(screen.queryByText("Retry")).toBeNull();
    });

    it("should call onRetry when the user presses the retry button on a locked device", () => {
      mockDeviceActionImpl.mockImplementation(
        ({ device, renderConnectYourDevice }: Parameters<typeof mockDeviceActionImpl>[0]) =>
          renderConnectYourDevice({
            device,
            isLocked: true,
            unresponsive: false,
            onRetry: mockOnRetry,
          }),
      );

      render(<SignatureScreen />);
      fireEvent.press(screen.getByText("Retry"));

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  // ── Bluetooth issues ──────────────────────────────────────────────────────

  describe("Bluetooth issue branch", () => {
    it("should render SimplifiedTransactionConfirm directly (without DeviceAction) when a BLE issue is detected", () => {
      jest.mocked(UseSignatureViewModelModule.useSignatureViewModel).mockReturnValue(
        buildViewModel({
          bluetooth: {
            hasIssue: true,
            bluetoothRequirementsState: "bluetooth_disabled",
            retryRequestOnIssue: jest.fn(),
            cannotRetryRequest: false,
            onDrawerClose: jest.fn(),
          },
        }),
      );

      render(<SignatureScreen />);

      expect(mockDeviceActionImpl).not.toHaveBeenCalled();
      expect(screen.getByTestId("send-signature-prompt")).toBeOnTheScreen();
    });
  });
});
