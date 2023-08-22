import { FormControlLabel, RadioGroup } from "@material-ui/core";
import Radio from "components/Radio";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";

interface PermissionsModeSelectorProps {
  disableAuto?: boolean;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}

export const AUTO = "AUTO";
export const MANUAL = "MANUAL";

export default function PermissionsModeSelector(
  props: PermissionsModeSelectorProps
) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!props.value) {
      props.setValue(AUTO);
    }
  }, []);
  return (
    <FormItem
      infoType={InfoBarTypes.PERMISSIONS_TYPE}
      optionTitle={t("applog:logSourceDesc.ec2.step1.permissionMethod")}
      optionDesc={
        <>
          <>{t("applog:logSourceDesc.ec2.step1.permissionsDesc")}</>
          <ExtLink to="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-iam.html">
            {t("applog:logSourceDesc.ec2.step1.permissionsDesc2")}
          </ExtLink>
        </>
      }
    >
      <RadioGroup
        value={props.value}
        onChange={(e) => {
          props.setValue(e.target.value);
        }}
      >
        {!props.disableAuto && (
          <FormControlLabel
            value={AUTO}
            control={<Radio />}
            label={t("applog:logSourceDesc.ec2.step1.permissionAuto")}
          />
        )}
        <FormControlLabel
          value={MANUAL}
          control={<Radio />}
          label={t("applog:logSourceDesc.ec2.step1.permissionManual")}
        />
      </RadioGroup>
    </FormItem>
  );
}
