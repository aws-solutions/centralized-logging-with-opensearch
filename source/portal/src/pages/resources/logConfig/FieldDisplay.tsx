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

import TextArea from "components/TextArea";
import React from "react";

interface FiledDisplayProps {
  isTextArea?: boolean;
  text: string;
}

const FieldDisplay: React.FC<FiledDisplayProps> = (
  props: FiledDisplayProps
) => {
  const { isTextArea, text } = props;
  if (isTextArea) {
    return (
      <TextArea
        rows={5}
        disabled
        value={text}
        onChange={(event) => {
          console.info(event);
        }}
      />
    );
  }
  return <div className="log-config-display-text">{text}</div>;
};

export default FieldDisplay;
