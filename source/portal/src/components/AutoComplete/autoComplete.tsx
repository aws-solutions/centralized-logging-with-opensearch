/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
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
export interface OptionType {
  name: string;
  value: string;
  description?: string;
}

type AutoCompleteMenuProp = {
  disabled?: boolean;
  value: OptionType | null;
  optionList: OptionType[];
  className?: string;
  placeholder?: string;
  loading?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (event: any, data: any) => void;
};

const autoComplete: React.FC<AutoCompleteMenuProp> = (
  props: AutoCompleteMenuProp
) => {
  const {
    disabled,
    value,
    loading,
    optionList,
    placeholder,
    className,
    onChange,
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
        onChange={(event, data) => onChange(event, data)}
        getOptionLabel={(option) => option.name}
        renderInput={(params) => (
          <div ref={params.InputProps.ref}>
            <input
              placeholder={placeholder}
              type="search"
              autoComplete="off"
              {...params.inputProps}
            />
          </div>
        )}
      />
    </div>
  );
};

export default autoComplete;
