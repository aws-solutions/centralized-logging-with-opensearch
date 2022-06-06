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
import React from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import Typography from "@material-ui/core/Typography";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";

type BreadcrumbType = {
  name: string;
  link?: string;
};

interface BreadcrumbProps {
  list: BreadcrumbType[];
}

const breadcrumb: React.FC<BreadcrumbProps> = (props: BreadcrumbProps) => {
  const { list } = props;
  return (
    <div className="bread-crumb">
      <Breadcrumbs
        aria-label="breadcrumb"
        separator={<NavigateNextIcon fontSize="medium" />}
      >
        {list.map((element, index) => {
          if (element.link) {
            return (
              <Link key={index} color="inherit" to={element.link}>
                {element.name}
              </Link>
            );
          } else {
            return (
              <Typography key={index} color="textPrimary">
                {element.name}
              </Typography>
            );
          }
        })}
      </Breadcrumbs>
    </div>
  );
};

export default breadcrumb;
