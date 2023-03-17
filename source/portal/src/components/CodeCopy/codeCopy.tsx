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
import React, { useState, useEffect, useCallback } from "react";
import CopyButton from "components/CopyButton";
import LoadingText from "components/LoadingText";
import { useTranslation } from "react-i18next";

interface CodeCopyProps {
  loading?: boolean;
  code: string;
}

const CodeCopy: React.FC<CodeCopyProps> = (props: CodeCopyProps) => {
  const { loading, code } = props;
  const { t } = useTranslation();
  const [width, setWidth] = useState(null);
  const [menuWidth, setMenuWidth] = useState(0);
  const div = useCallback((node) => {
    if (node !== null) {
      setWidth(node.getBoundingClientRect().width);
      setMenuWidth(
        window.innerWidth - parseInt(node.getBoundingClientRect().width)
      );
    }
  }, []);

  const handleResize = () => {
    setWidth((window.innerWidth - menuWidth) as any);
  };

  useEffect(() => {
    if (menuWidth) {
      window.addEventListener("resize", handleResize);
    }
  }, [menuWidth]);

  return (
    <div className="flex">
      <div className="flex-1">
        <div ref={div} style={{ width: width || "100%" }}>
          <pre className="code">
            {loading ? <LoadingText /> : <code>{code}</code>}
          </pre>
        </div>
      </div>
      <div className="ml-10">
        {
          <CopyButton disabled={loading} text={code}>
            {t("button.copy")}
          </CopyButton>
        }
      </div>
    </div>
  );
};

export default CodeCopy;
