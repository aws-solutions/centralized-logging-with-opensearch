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
import React, { useRef, useEffect } from "react";

export const CHECKED = 1;
export const UNCHECKED = 2;
export const INDETERMINATE = -1;

interface InteCheckBoxProp {
  disabled: boolean;
  value: number;
  onChange: (event: any) => void;
}

const IndeterminateCheckbox: React.FC<InteCheckBoxProp> = (props: any) => {
  const { disabled, value, onChange, ...otherProps } = props;
  const checkRef: any = useRef();

  useEffect(() => {
    console.info("value:", value);
    checkRef.current.checked = value === CHECKED;
    checkRef.current.indeterminate = value === INDETERMINATE;
  }, [value]);

  return (
    <input
      disabled={disabled}
      onChange={onChange}
      color="primary"
      type="checkbox"
      ref={checkRef}
      {...otherProps}
    />
  );
};
export default IndeterminateCheckbox;
