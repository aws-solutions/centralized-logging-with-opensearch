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
/* eslint-disable react/display-name */
import React, { useState } from "react";
import Button from "components/Button";
import Modal from "components/Modal";
import { TablePanel } from "components/TablePanel";
import { BucketList, BucketProps } from "mock/data";
import { Pagination } from "@material-ui/lab";
import RefreshIcon from "@material-ui/icons/Refresh";
import { SelectType } from "components/TablePanel/tablePanel";

type S3SelectProp = {
  value: string;
  className?: string;
  placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (event: any) => void;
};

const S3Select: React.FC<S3SelectProp> = (props: S3SelectProp) => {
  const { value, placeholder, className, onChange } = props;
  const [openS3Modal, setOpenS3Modal] = useState(false);
  return (
    <>
      <div
        className={className ? `${className} gsui-s3select` : "gsui-s3select"}
      >
        <div className="s3-input">
          <input
            value={value}
            type="text"
            placeholder={placeholder}
            onChange={(event) => {
              onChange(event);
            }}
          />
        </div>
        <Button
          onClick={() => {
            setOpenS3Modal(true);
          }}
        >
          Browser S3
        </Button>
      </div>
      <Modal
        title="Choose S3 Bucket"
        fullWidth={true}
        isOpen={openS3Modal}
        closeModal={() => {
          setOpenS3Modal(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              btnType="text"
              onClick={() => {
                setOpenS3Modal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpenS3Modal(false);
              }}
            >
              Choose
            </Button>
          </div>
        }
      >
        <TablePanel
          title="Buckets"
          selectType={SelectType.RADIO}
          changeSelected={(item) => {
            console.info(item);
          }}
          columnDefinitions={[
            {
              id: "bucketName",
              header: "Name",
              cell: (e: BucketProps) => e.bucketName,
              // sortingField: "alt",
            },
            {
              id: "bucketRegion",
              header: "Region",
              cell: (e: BucketProps) => e.bucketRegion,
            },
            {
              id: "creationDate",
              header: "Creation Date",
              cell: (e: BucketProps) => e.creationDate,
            },
          ]}
          items={BucketList}
          actions={
            <div>
              <Button>
                <RefreshIcon fontSize="small" />
              </Button>
            </div>
          }
          pagination={<Pagination count={2} size="small" />}
        />
      </Modal>
    </>
  );
};

export default S3Select;
