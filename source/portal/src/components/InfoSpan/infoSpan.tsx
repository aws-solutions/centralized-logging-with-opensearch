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
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { ActionType, InfoBarTypes } from "reducer/appReducer";

interface SpanInfoProps {
  spanType: InfoBarTypes | undefined;
}

const InfoSpan: React.FC<SpanInfoProps> = (props: SpanInfoProps) => {
  const { spanType } = props;
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const openInfoBar = React.useCallback(() => {
    dispatch({ type: ActionType.OPEN_INFO_BAR });
    dispatch({ type: ActionType.SET_INFO_BAR_TYPE, infoBarType: spanType });
  }, [dispatch, spanType]);
  return (
    <span className="gsui-info-span" onClick={openInfoBar}>
      {t("info")}
    </span>
  );
};

export default InfoSpan;
