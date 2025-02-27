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
import React, { ReactElement } from "react";
import { withStyles, Theme, createStyles } from "@material-ui/core/styles";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";

type StyledTabProps = {
  value?: string;
  className?: string;
} & React.ComponentProps<typeof Tab>

const AntTabs = withStyles({
  root: {
    borderBottom: "1px solid #d5dbdb",
  },
  indicator: {
    backgroundColor: "#16191f",
  },
})(Tabs);

export const getColoredTab = (color = "#ec7211") => withStyles((theme: Theme) =>
  createStyles({
    root: {
      textTransform: "none",
      minWidth: 72,
      fontWeight: "bold",
      // borderRight: "1px solid #f00",
      marginRight: theme.spacing(4),
      "&:hover": {
        color,
        opacity: 1,
      },
      "&$selected": {
        color,
        fontWeight: "bold",
      },
      "&:focus": {
        color,
      },
    },
    selected: {},
  })
)((props: StyledTabProps) => <Tab disableRipple {...props} />);

const AntTab = getColoredTab();

interface TabPanelProps {
  children?: any;
  index: string;
  value: string;
}

const TabPanel = (props: TabPanelProps): ReactElement => {
  const { children, value, index, ...other } = props;

  return (
    <div
      className="gsui-tab-content"
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-auto-tabpanel-${index}`}
      aria-labelledby={`scrollable-auto-tab-${index}`}
      {...other}
    >
      {value === index && (
        // <Box p={3}>
        <Typography component={"span"} variant={"body2"}>
          {children}
        </Typography>
        // </Box>
      )}
    </div>
  );
};

export { AntTabs, AntTab, TabPanel };
