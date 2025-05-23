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
import React, {
  FC,
  useState,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  useEffect,
  useRef,
} from "react";
import classNames from "classnames";
import LoadingText from "components/LoadingText";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ArrowDropUpIcon from "@material-ui/icons/ArrowDropUp";
import { useTranslation } from "react-i18next";

export type ButtonSize = "lg" | "sm";
export type ButtonType =
  | "primary"
  | "default"
  | "danger"
  | "link"
  | "text"
  | "icon"
  | "loading";

interface DropDownListProp {
  text: string;
  id: string;
  disabled?: boolean;
  testId?: string;
}

interface BaseButtonProps {
  onItemClick: (item: DropDownListProp) => void;
  items: DropDownListProp[];
  className?: string;
  /**设置 Button 的禁用 */
  disabled?: boolean;
  /**设置 Button 的尺寸 */
  size?: ButtonSize;
  /**设置 Button 的类型 */
  btnType?: ButtonType;
  loading?: boolean;
  loadingColor?: string;
  children: React.ReactNode;
  href?: string;
  isI18N?: boolean;
}
type NativeButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLElement>;
type AnchorButtonProps = BaseButtonProps & AnchorHTMLAttributes<HTMLElement>;
export type ButtonProps = Partial<NativeButtonProps & AnchorButtonProps>;
/**
 * 页面中最常用的的按钮元素，适合于完成特定的交互
 * ### 引用方法
 */
export const Button: FC<ButtonProps> = (props) => {
  const {
    onItemClick,
    items,
    btnType = "default",
    className,
    disabled = false,
    loading,
    loadingColor,
    size,
    children,
    href,
    isI18N,
    ...restProps
  } = props;
  const classes = classNames("btn", className, {
    [`btn-${btnType}`]: btnType,
    [`btn-${size}`]: size,
    disabled: btnType === "link" && disabled,
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <button className={classes} disabled={true} {...restProps}>
        <LoadingText color={loadingColor ? loadingColor : "#fff"} />
        {children}
      </button>
    );
  } else {
    if (btnType === "link" && href) {
      return (
        <a className={classes} href={href} {...restProps}>
          {children}
        </a>
      );
    } else {
      return (
        <div className="btn-drop-down-wrap" ref={dropdownRef}>
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
            }}
            className={`${classes} btn-drop-down`}
            disabled={disabled}
            {...restProps}
          >
            {children}{" "}
            <span className="dropdown-icon">
              {showDropdown ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
            </span>
          </button>
          {showDropdown && (
            <div className="drop-down-items">
              {items?.map((element) => {
                return (
                  <div
                    key={element.id}
                    data-testid={element.testId}
                    onClick={() => {
                      if (onItemClick && !element.disabled) {
                        onItemClick(element);
                        setShowDropdown(false);
                      }
                    }}
                    className={classNames("menu-item", {
                      disabled: element.disabled,
                    })}
                  >
                    {isI18N ? t(element.text) : element.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
  }
};

export default Button;
