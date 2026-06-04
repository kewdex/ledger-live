import React from "react";
import { View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Text } from "@ledgerhq/lumen-ui-rnative";
import { useStyleSheet } from "@ledgerhq/lumen-ui-rnative/styles";
import { getDeviceModel } from "@ledgerhq/devices";
import type { Device } from "@ledgerhq/live-common/hw/actions/types";
import { useTranslation } from "~/context/Locale";
import Animation from "~/components/Animation";
import { getDeviceAnimation, getDeviceAnimationStyles } from "~/helpers/getDeviceAnimation";

type SimplifiedTransactionConfirmProps = Readonly<{
  device: Device;
  title?: string;
  description?: string | null;
  animationKey?: "verify" | "plugAndPinCode" | "enterPinCode";
}>;

export function SimplifiedTransactionConfirm({
  device,
  title,
  description,
  animationKey = "verify",
}: SimplifiedTransactionConfirmProps) {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const colorScheme = dark ? "dark" : "light";

  const styles = useStyleSheet(
    theme => ({
      container: {
        flex: 1,
      },
      animation: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      },
      text: {
        alignItems: "center",
        gap: theme.spacings.s8,
        paddingBottom: theme.spacings.s16,
      },
    }),
    [],
  );

  const wording = getDeviceModel(device.modelId).productName;
  const resolvedTitle = title ?? t("send.newSendFlow.sign.title", { wording });
  const resolvedDescription =
    description === undefined ? t("send.newSendFlow.sign.description") : description;

  return (
    <View style={styles.container} testID="send-signature-prompt">
      <View style={styles.animation}>
        <Animation
          source={getDeviceAnimation({
            modelId: device.modelId,
            key: animationKey,
            theme: colorScheme,
          })}
          style={getDeviceAnimationStyles(device.modelId)}
        />
      </View>
      <View style={styles.text}>
        <Text
          typography="heading4SemiBold"
          lx={{ color: "base", textAlign: "center" }}
          testID="send-signature-title"
        >
          {resolvedTitle}
        </Text>
        {resolvedDescription ? (
          <Text typography="body2" lx={{ color: "muted", textAlign: "center" }}>
            {resolvedDescription}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
