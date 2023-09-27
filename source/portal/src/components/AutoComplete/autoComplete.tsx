/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React from "react";
import SearchIcon from "@material-ui/icons/Search";
import Autocomplete from "@material-ui/lab/Autocomplete";
import LoadingText from "components/LoadingText";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { useTranslation } from "react-i18next";
import { StatusType } from "components/Status/Status";

export interface OptionType {
  name: string;
  value: string;
  description?: string;
  ec2RoleArn?: string;
  bufferType?: string;
  logConfigId?: string;
  logConfigVersionNumber?: number;
  status?: string;
}

type AutoCompleteMenuProp = {
  disabled?: boolean;
  value: OptionType | null;
  optionList: OptionType[];
  className?: string;
  placeholder?: string | null | any;
  loading?: boolean;
  outerLoading?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (event: any, data: any) => void;
  hasStatus?: boolean;
};

const ItemStatus = ({ status }: any) => {
  const { t } = useTranslation();
  return (
    <>
      {status === StatusType.Deleted && (
        <span className="select-item-status red">
          <i className="icon">
            <HighlightOffIcon fontSize="small" />
          </i>
          {t("status.deleted")}
        </span>
      )}
    </>
  );
};

const autoComplete: React.FC<AutoCompleteMenuProp> = (
  props: AutoCompleteMenuProp
) => {
  const {
    disabled,
    value,
    loading,
    outerLoading,
    optionList,
    placeholder,
    className,
    onChange,
    hasStatus,
  } = props;

  return (
    <div className="gsui-autocomplete-select">
      <SearchIcon className="input-icon" />
      <Autocomplete
        disabled={disabled}
        loading={loading}
        loadingText={<LoadingText text="loading" />}
        className={className}
        options={optionList}
        value={value}
        getOptionSelected={(option, value) => option.value === value.value}
        onChange={(event, data) => onChange(event, data)}
        getOptionLabel={(option) => option.name}
        getOptionDisabled={(option) => option.status === StatusType.Deleted}
        renderOption={(option) => (
          <React.Fragment>
            <div className="flex flex-1 space-between">
              <span>{option.name}</span>
              {hasStatus && <ItemStatus status={option.status} />}
            </div>
          </React.Fragment>
        )}
        renderInput={(params) => (
          <div ref={params.InputProps.ref}>
            <input
              placeholder={placeholder || ""}
              type="search"
              autoComplete="off"
              {...params.inputProps}
            />
            {outerLoading && loading && (
              <span className="outer-loading">
                <LoadingText />
              </span>
            )}
          </div>
        )}
      />
    </div>
  );
};

export default autoComplete;
