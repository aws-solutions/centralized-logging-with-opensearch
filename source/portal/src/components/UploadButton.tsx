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
import Button from "components/Button";
import Publish from "@material-ui/icons/Publish";
import { ButtonProps } from "./Button/button";
import { makeStyles } from "@material-ui/core";

const useStyles = makeStyles(() => ({
  input: {
    display: "none",
  },
}));

type ExtButtonProps = {
  multiple?: boolean;
  accept: string;
  onFileChange?: (files: FileList | null) => void;
} & ButtonProps;

export const UploadButton = (props: ExtButtonProps) => {
  const { multiple, accept, onFileChange, children, ...restProps } = props;
  const classes = useStyles();

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log(files);
    if (onFileChange && files) {
      onFileChange(files);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input
        accept={accept}
        className={classes.input}
        multiple={multiple}
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
      />
      <Button {...restProps} btnType="icon" onClick={handleClick}>
        <Publish fontSize="small" />
        {children}
      </Button>
    </div>
  );
};
