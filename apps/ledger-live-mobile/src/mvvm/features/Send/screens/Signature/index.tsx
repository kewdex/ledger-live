import React from "react";
import { View } from "react-native";
import { Button } from "@ledgerhq/lumen-ui-rnative";
import { getDeviceModel } from "@ledgerhq/devices";
import { HOOKS_TRACKING_LOCATIONS } from "~/analytics/hooks/variables";
import DeviceAction from "~/components/DeviceAction";
import InfiniteLoader from "~/components/InfiniteLoader";
import BluetoothRequirementsDrawer from "~/components/RequiresBLE/BluetoothRequirementsDrawer";
import { useTranslation } from "~/context/Locale";
import { SendFlowLayout } from "../../components/SendFlowLayout";
import { SimplifiedTransactionConfirm } from "./components/SimplifiedTransactionConfirm";
import { useSignatureViewModel } from "./hooks/useSignatureViewModel";

export function SignatureScreen() {
  const { t } = useTranslation();
  const { account, transaction, device, action, request, onDeviceActionResult, bluetooth } =
    useSignatureViewModel();

  if (!account || !transaction || !device || !request) {
    return null;
  }

  if (bluetooth.hasIssue) {
    return (
      <SendFlowLayout>
        <View style={{ flex: 1 }} testID="send-signature-step">
          <SimplifiedTransactionConfirm device={device} />
          <BluetoothRequirementsDrawer
            isOpenedOnIssue
            onUserClose={bluetooth.onDrawerClose}
            bluetoothRequirementsState={bluetooth.bluetoothRequirementsState}
            retryRequestOnIssue={bluetooth.retryRequestOnIssue}
            cannotRetryRequest={bluetooth.cannotRetryRequest}
          />
        </View>
      </SendFlowLayout>
    );
  }

  return (
    <SendFlowLayout>
      <View style={{ flex: 1 }} testID="send-signature-step">
        <DeviceAction
          action={action}
          device={device}
          request={request}
          onResult={onDeviceActionResult}
          analyticsPropertyFlow="send"
          location={HOOKS_TRACKING_LOCATIONS.sendFlow}
          renderLoading={({ device, connectedDevice, isWaitingForAppConnection }) => {
            if (!connectedDevice) {
              return (
                <SimplifiedTransactionConfirm
                  device={device}
                  animationKey="plugAndPinCode"
                  title={t(
                    device.wired
                      ? "DeviceAction.connectAndUnlockDevice"
                      : "DeviceAction.powerOnDevice",
                    { deviceName: getDeviceModel(device.modelId).productName },
                  )}
                  description={null}
                />
              );
            }

            if (isWaitingForAppConnection) {
              return <SimplifiedTransactionConfirm device={device} />;
            }

            return (
              <View
                style={{
                  flex: 1,
                  height: "100%",
                  minHeight: 320,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <InfiniteLoader testID="send-signature-loading" />
              </View>
            );
          }}
          renderConnectYourDevice={({ device, unresponsive, isLocked, onRetry }) => (
            <SignatureConnectDevicePrompt
              device={device}
              unresponsive={unresponsive}
              isLocked={isLocked}
              onRetry={onRetry}
            />
          )}
          renderError={() => null}
          renderAllowManagerRequested={({ device }) => (
            <SimplifiedTransactionConfirm device={device} />
          )}
          renderAllowOpeningRequested={({ device }) => (
            <SimplifiedTransactionConfirm device={device} />
          )}
          renderDeviceSignatureRequested={({ device }) => (
            <SimplifiedTransactionConfirm device={device} />
          )}
        />
      </View>
    </SendFlowLayout>
  );
}

type SignatureConnectDevicePromptProps = Readonly<{
  device: Parameters<typeof SimplifiedTransactionConfirm>[0]["device"];
  unresponsive?: boolean | null;
  isLocked?: boolean;
  onRetry: () => void;
}>;

function SignatureConnectDevicePrompt({
  device,
  unresponsive,
  isLocked,
  onRetry,
}: SignatureConnectDevicePromptProps) {
  const { t } = useTranslation();

  const needsUnlock = Boolean(isLocked || unresponsive);
  const titleKey = needsUnlock
    ? "DeviceAction.unlockDevice"
    : device.wired
      ? "DeviceAction.connectAndUnlockDevice"
      : "DeviceAction.powerOnDevice";

  return (
    <View style={{ flex: 1 }}>
      <SimplifiedTransactionConfirm
        device={device}
        animationKey={needsUnlock ? "enterPinCode" : "plugAndPinCode"}
        title={t(titleKey, { deviceName: getDeviceModel(device.modelId).productName })}
        description={null}
      />
      {/* In "event" device-action mode, a locked device emits `lockedDevice` and the
          connection stream completes, so it cannot resume on its own once unlocked.
          Surface an explicit retry to re-establish the connection */}
      {isLocked ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Button appearance="base" size="lg" onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
