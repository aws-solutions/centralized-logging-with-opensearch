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
import classNames from "classnames";
type DefautlProps = React.HTMLAttributes<HTMLInputElement>;

type TextInputProp = {
  type?: string;
  value: string;
  isSearch?: boolean;
  className?: string;
  placeholder?: string | null | any;
  disabled?: boolean;
  readonly?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (event: any) => void;
};

const POSITIVE_NUMBER = /^(0|[1-9]\d*)(\.\d+)?$/;

const TextInput: React.FC<TextInputProp & DefautlProps> = (
  props: TextInputProp & DefautlProps
) => {
  const {
    type,
    value,
    placeholder,
    className,
    disabled,
    isSearch,
    readonly,
    onChange,
    ...defaultProps
  } = props;

  return (
    <div
      className={classNames(
        "gsui-textinput",
        { "is-search": isSearch },
        className
      )}
    >
      {isSearch && <SearchIcon className="input-icon" />}
      <input
        {...defaultProps}
        readOnly={readonly}
        disabled={disabled}
        value={value}
        type={type ? type : "text"}
        onWheel={(event) => event.currentTarget.blur()}
        placeholder={placeholder || ""}
        onChange={(event) => {
          if (
            type === "number" &&
            event.target.value !== "" &&
            !new RegExp(POSITIVE_NUMBER).test(event.target.value)
          ) {
            return false;
          }
          onChange(event);
        }}
      />
    </div>
  );
};

export default TextInput;
