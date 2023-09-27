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
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import LanguageIcon from "@material-ui/icons/Language";
import FeedbackIcon from "@material-ui/icons/Feedback";
import {
  EN_LANGUAGE_LIST,
  URL_FEEDBACK,
  ZH_LANGUAGE_LIST,
} from "assets/js/const";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";

const langList = [
  {
    id: "en",
    name: "English",
  },
  {
    id: "zh",
    name: "中文(简体)",
  },
];

const getCurrentLangObj = (id: string) => {
  let defaultItem = null;
  langList.forEach((item) => {
    if (id === item.id) {
      defaultItem = item;
    }
  });
  return defaultItem ? defaultItem : langList[0];
};

const Bottom: React.FC = () => {
  const { t, i18n } = useTranslation();
  const amplifyConfig = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  if (EN_LANGUAGE_LIST.indexOf(i18n.language) >= 0) {
    i18n.language = "en";
  }
  if (ZH_LANGUAGE_LIST.indexOf(i18n.language) >= 0) {
    i18n.language = "zh";
  }
  const initLang = getCurrentLangObj(i18n.language);
  const [currentLang, setCurrentLang] = useState(initLang);

  const changeSelectLang: any = (event: any) => {
    const newLang = JSON.parse(event.target.getAttribute("data-lang"));
    setCurrentLang(newLang);
    i18n.changeLanguage(newLang.id);
    document.title = t("title");
    setShowLang(false);
  };

  const [showLang, setShowLang] = useState(false);
  const toggleShowLang = () => {
    setShowLang(!showLang);
  };

  return (
    <div className="page-bottom">
      <a rel="noopener noreferrer" href={URL_FEEDBACK} target="_blank">
        <div className="item feedback">
          <FeedbackIcon className="bottom-icon" fontSize="small" />
          {t("bottom.feedback")}
        </div>
      </a>
      <div className="item language">
        {showLang ? (
          <div className="language-select">
            <ul>
              {langList.map((item: any) => {
                return (
                  <li
                    key={item.id}
                    data-lang={JSON.stringify(item)}
                    onClick={changeSelectLang}
                  >
                    {item.name}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          ""
        )}
        <span onClick={toggleShowLang}>
          <LanguageIcon className="bottom-icon" fontSize="small" />{" "}
          <span>{currentLang.name}</span>
        </span>
      </div>

      {/* <span className="privacy">{t("bottom.use")}</span>
      <span className="privacy">{t("bottom.privacy")}</span> */}
      <span className="privacy no-pointer">
        ({`${t("version")} : ${amplifyConfig.solution_version || "-"}`})
      </span>

      <span className="notice">
        {`© 2008 -${new Date().getFullYear()}, `}
        {t("bottom.copy")}
      </span>
    </div>
  );
};

export default Bottom;
