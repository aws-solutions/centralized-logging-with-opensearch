import { FormControlLabel, RadioGroup } from "@material-ui/core";
import Radio from "components/Radio";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface PermissionsModeSelectorProps {
  disableAuto?: boolean;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}

export const AUTO = "AUTO";
export const MANUAL = "MANUAL";

const PermissionsModeSelector: React.FC<PermissionsModeSelectorProps> = (
  props: PermissionsModeSelectorProps
) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!props.value) {
      props.setValue(AUTO);
    }
  }, []);
  return (
    <FormItem
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
        className="radio-group"
        value={props.value}
        onChange={(e) => {
          props.setValue(e.target.value);
        }}
      >
        {!props.disableAuto && (
          <FormControlLabel
            value={AUTO}
            control={<Radio />}
            label={
              <div>
                <div className="radio-title">
                  {t("applog:logSourceDesc.ec2.step1.auto")}
                </div>
                <div className="radio-desc">
                  {t("applog:logSourceDesc.ec2.step1.permissionAuto")}
                </div>
              </div>
            }
          />
        )}
        <FormControlLabel
          value={MANUAL}
          control={<Radio />}
          label={
            <div>
              <div className="radio-title">
                {t("applog:logSourceDesc.ec2.step1.manual")}
              </div>
              <div className="radio-desc">
                {t("applog:logSourceDesc.ec2.step1.permissionManual")}
              </div>
            </div>
          }
        />
      </RadioGroup>
    </FormItem>
  );
};

export default PermissionsModeSelector;
