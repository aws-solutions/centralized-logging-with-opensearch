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
import classNames from "classnames";

type TextAreaProp = {
  type?: string;
  rows: number;
  value: string;
  isSearch?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (event: any) => void;
};

const TextArea: React.FC<TextAreaProp> = (props: TextAreaProp) => {
  const { value, rows, placeholder, className, disabled, readonly, onChange } =
    props;

  return (
    <div className={classNames("gsui-textarea", className)}>
      <textarea
        rows={rows}
        readOnly={readonly}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event);
        }}
      />
    </div>
  );
};

export default TextArea;
