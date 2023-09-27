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
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import {
  CONFIG_FILTER_GREP_LINK,
  REG_EX_LOG_HELP_LINK_1,
} from "assets/js/const";

const ConfigFilter: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        <div>
          <b>{t("info:configFilter.sample")}</b>
        </div>
        <div className="mt-10">
          {t("info:configFilter.tips1")}
          <pre className="code mt-5">
            <code>
              {`{"host":"92.13.1.23", "level": "WARN", "user-identifier":"bashirian1889", "datetime":"31/Oct/2022:06:21:35 +0000'", "method": "GET", "request": "/orders", "protocol":"HTTP/1.1", "status":200, "bytes":8376, "referer": "http://www.leadinterfaces.com/benchmark/niches"}`}
              {<br />}
              {`{"host":"96.193.81.138", "level": "INFO", "user-identifier":"bashirian2408", "datetime":"31/Oct/2022:06:21:31 +0000'", "method": "GET", "request": "/user/info", "protocol":"HTTP/1.1", "status":200, "bytes":1031, "referer": "http://www.leadinterfaces.com/benchmark/niches"}`}
              {<br />}
              {`{"host":"56.24.3.142", "level": "INFO", "user-identifier":"bashirian1937", "datetime":"31/Oct/2022:06:21:31 +0000'", "method": "POST", "request": "/login", "protocol":"HTTP/1.1", "status":200, "bytes":894, "referer": "http://www.leadinterfaces.com/benchmark/niches"}`}
              {<br />}
              {`{"host":"56.24.3.142", "level": "INFO", "user-identifier":"bashirian1937", "datetime":"31/Oct/2022:06:21:34 +0000'", "method": "POST", "request": "/logout", "protocol":"HTTP/1.1", "status":200, "bytes":896, "referer": "http://www.leadinterfaces.com/benchmark/niches"}`}
            </code>
          </pre>
          <div>
            {t("info:configFilter.tips2")}
            <br />
            <ol className="mt-5">
              <li>{t("info:configFilter.tips2_1")}</li>
              <li>{t("info:configFilter.tips2_2")}</li>
              <li>{t("info:configFilter.tips2_3")}</li>
            </ol>
          </div>
        </div>
        <div className="mt-5">
          <div>
            {t("info:configFilter.tips3")}
            <div className="mt-5">
              <table
                cellPadding={1}
                cellSpacing={1}
                width="100%"
                className="info-table"
              >
                <thead>
                  <tr>
                    <th className="object-number">
                      {t("resource:config.filter.key")}
                    </th>
                    <th>{t("resource:config.filter.condition")}</th>
                    <th>{t("resource:config.filter.regex")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>method</td>
                    <td className="line">
                      {t("resource:config.filter.include")}
                    </td>
                    <td className="break">POST|GET|POST|DELETE</td>
                  </tr>
                  <tr>
                    <td>request</td>
                    <td className="line">
                      {t("resource:config.filter.exclude")}
                    </td>
                    <td className="break">^(/user/*|/login|/logout)</td>
                  </tr>
                  <tr>
                    <td>level</td>
                    <td className="line">
                      {t("resource:config.filter.include")}
                    </td>
                    <td className="break">ERROR|WARN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="mt-10">
          {t("info:configFilter.tips4")}
          <pre className="code mt-5">
            <code>
              {`{"host":"92.13.1.23", "level": "WARN", "user-identifier":"bashirian1889", "datetime":"31/Oct/2022:06:21:35 +0000'", "method": "GET", "request": "/orders", "protocol":"HTTP/1.1", "status":200, "bytes":8376, "referer": "http://www.leadinterfaces.com/benchmark/niches"}`}
            </code>
          </pre>
        </div>
      </div>
      <div className="gsui-help-more">
        <div className="learn-more">
          {t("info:learnMore")}
          <i>
            <OpenInNewIcon className="icon" fontSize="small" />
          </i>
        </div>
        <div className="gsui-help-link-item">
          <a href={REG_EX_LOG_HELP_LINK_1} target="_blank" rel="noreferrer">
            {t("info:regExLogFormat.link1")}
          </a>
        </div>
        <div className="gsui-help-link-item">
          <a href={CONFIG_FILTER_GREP_LINK} target="_blank" rel="noreferrer">
            {t("info:configFilter.filterLink")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConfigFilter;
