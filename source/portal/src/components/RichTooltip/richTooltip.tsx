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

import {
  Box,
  ClickAwayListener,
  makeStyles,
  Paper,
  Popper,
  PopperPlacementType,
} from "@material-ui/core";
import React, { ReactElement } from "react";

interface Props {
  content: ReactElement;
  children: ReactElement;
  open: boolean;
  onClose?: () => void;
  arrow?: boolean;
  placement?: PopperPlacementType;
}

const useStyles = makeStyles((theme) => {
  const color = theme.palette.background.paper; // Feel free to customise this like they do in Tooltip
  return {
    popoverRoot: {
      backgroundColor: color,
      maxWidth: 1000,
    },
    content: {
      padding: theme.spacing(2),
    },

    popper: {
      zIndex: 2000,
      '&[x-placement*="bottom"] $arrow': {
        top: 0,
        left: 0,
        marginTop: "-0.71em",
        marginLeft: 4,
        marginRight: 4,
        "&::before": {
          transformOrigin: "0 100%",
        },
      },
      '&[x-placement*="top"] $arrow': {
        bottom: 0,
        left: 0,
        marginBottom: "-0.71em",
        marginLeft: 4,
        marginRight: 4,
        "&::before": {
          transformOrigin: "100% 0",
        },
      },
      '&[x-placement*="right"] $arrow': {
        left: 0,
        marginLeft: "-0.71em",
        height: "1em",
        width: "0.71em",
        marginTop: 4,
        marginBottom: 4,
        "&::before": {
          transformOrigin: "100% 100%",
        },
      },
      '&[x-placement*="left"] $arrow': {
        right: 0,
        marginRight: "-0.71em",
        height: "1em",
        width: "0.71em",
        marginTop: 4,
        marginBottom: 4,
        "&::before": {
          transformOrigin: "0 0",
        },
      },
    },

    arrow: {
      overflow: "hidden",
      position: "absolute",
      width: "1em",
      height: "0.71em" /* = width / sqrt(2) = (length of the hypotenuse) */,
      boxSizing: "border-box",
      color,
      "&::before": {
        content: '""',
        margin: "auto",
        display: "block",
        width: "100%",
        height: "100%",
        boxShadow: theme.shadows[1],
        backgroundColor: "currentColor",
        transform: "rotate(45deg)",
      },
    },
  };
});

const RichTooltip = ({
  placement = "top",
  arrow = true,
  open,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onClose = () => {},
  content,
  children,
}: Props) => {
  const classes = useStyles();
  const [arrowRef, setArrowRef] = React.useState<HTMLElement | null>(null);
  const [childNode, setChildNode] = React.useState<HTMLElement | null>(null);

  return (
    <div>
      {React.cloneElement(children, { ...children.props, ref: setChildNode })}
      <Popper
        open={open}
        anchorEl={childNode}
        placement={placement}
        transition
        className={classes.popper}
        modifiers={{
          preventOverflow: {
            enabled: true,
            boundariesElement: "window",
          },
          arrow: {
            enabled: arrow,
            element: arrowRef,
          },
        }}
      >
        <Paper>
          <ClickAwayListener onClickAway={onClose}>
            <Paper className={classes.popoverRoot}>
              {arrow ? (
                <span className={classes.arrow} ref={setArrowRef} />
              ) : null}
              <Box className={classes.content}>{content}</Box>
            </Paper>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </div>
  );
};

export default RichTooltip;
