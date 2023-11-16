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
import { Link, useLocation } from "react-router-dom";
import CloseIcon from "@material-ui/icons/Close";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import MenuIcon from "@material-ui/icons/Menu";
import ExtLink from "components/ExtLink";

import { useSelector, useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import {
  buildSolutionDocsLink,
  SIDE_BAR_OPEN_STORAGE_ID,
} from "assets/js/const";
import { useTranslation } from "react-i18next";
import { RootState } from "reducer/reducers";

interface SideMenuProps {
  className?: string;
}

const SIDE_MENU_LIST = [
  {
    name: "menu.home",
    link: "/",
    subMenu: [],
    open: true,
  },
  {
    name: "menu.cluster",
    link: "/clusters",
    subMenu: [
      {
        name: "menu.osDomain",
        link: "/clusters/opensearch-domains",
      },
      {
        name: "menu.importOS",
        link: "/clusters/import-opensearch-cluster",
      },
    ],
    open: true,
  },
  {
    name: "menu.logPipeline",
    link: "/log-pipeline",
    subMenu: [
      {
        name: "menu.serviceLog",
        link: "/log-pipeline/service-log",
      },
      {
        name: "menu.appLog",
        link: "/log-pipeline/application-log",
      },
    ],
    open: true,
  },
  {
    name: "menu.logSource",
    link: "/containers",
    subMenu: [
      {
        name: "menu.eksLog",
        link: "/containers/eks-log",
      },
      {
        name: "menu.instanceGroup",
        link: "/resources/instance-group",
      },
    ],
    open: true,
  },
  {
    name: "menu.resource",
    link: "/resources",
    subMenu: [
      {
        name: "menu.logConfig",
        link: "/resources/log-config",
      },
      {
        name: "menu.crossAccount",
        link: "/resources/cross-account",
      },
      {
        name: "menu.grafana",
        link: "/grafana/list",
      },
    ],
    open: true,
  },
];

export const SideMenu: React.FC<SideMenuProps> = (props: SideMenuProps) => {
  const { className } = props;
  const openMenu = useSelector(
    (state: RootState) => state.app.openSideMenu
  );
  const { t } = useTranslation();
  const [sideMenuList, setSideMenuList] = useState(SIDE_MENU_LIST);
  const dispatch = useDispatch();
  const location = useLocation();

  return (
    <div
      className={`${className} lh-side-menu`}
      style={{ marginLeft: openMenu ? undefined : -240 }}
    >
      {!openMenu && (
        <div
          className="collapse-menu"
          onClick={() => {
            localStorage.setItem(SIDE_BAR_OPEN_STORAGE_ID, "open");
            dispatch({ type: ActionType.OPEN_SIDE_MENU });
          }}
        >
          <MenuIcon className="menu-icon" />
        </div>
      )}
      {openMenu && (
        <div className="flex-1">
          <div>
            <CloseIcon
              onClick={() => {
                localStorage.setItem(SIDE_BAR_OPEN_STORAGE_ID, "close");
                dispatch({ type: ActionType.CLOSE_SIDE_MENU });
              }}
              className="close-icon"
            />
            <div className="head-title">{t("name")}</div>
            {sideMenuList.map((element, index) => {
              return (
                <div className="menu-item" key={element.name}>
                  {element.subMenu && element.subMenu.length > 0 ? (
                    <div
                      className="collapse-title"
                      onClick={() => {
                        setSideMenuList((prev) => {
                          const tmpMenu = JSON.parse(JSON.stringify(prev));
                          tmpMenu[index].open = !tmpMenu[index].open;
                          return tmpMenu;
                        });
                      }}
                    >
                      <i className="icon">
                        <ArrowDropDownIcon
                          className={element.open ? "" : "reverse-90"}
                        />
                      </i>
                      {t(element.name)}
                    </div>
                  ) : (
                    <div
                      className={
                        location.pathname === element.link ? "active" : ""
                      }
                    >
                      <Link to={element.link}>{t(element.name)}</Link>
                    </div>
                  )}
                  {element.subMenu &&
                    element.subMenu.length > 0 &&
                    element.open && (
                      <div>
                        {element.subMenu.map((subItem) => {
                          return (
                            <div
                              key={subItem.name}
                              className={
                                location.pathname === subItem.link
                                  ? "active"
                                  : ""
                              }
                            >
                              <Link to={subItem.link}>{t(subItem.name)}</Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
              );
            })}

            <div className="external-link">
              <div>
                <ExtLink to={buildSolutionDocsLink("welcome.html")}>
                  {t("menu.doc")}
                </ExtLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

SideMenu.defaultProps = {
  className: "",
};

export default SideMenu;
