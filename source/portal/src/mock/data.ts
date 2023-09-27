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
export interface BucketProps {
  id: string;
  bucketName: string;
  bucketRegion: string;
  creationDate: string;
}
export const BucketList: BucketProps[] = [
  {
    id: "1001",
    bucketName: "bucket-abc",
    bucketRegion: "us-east-1",
    creationDate: "2021-10-10 19:34:22",
  },
  {
    id: "1002",
    bucketName: "bucket-human",
    bucketRegion: "us-east-2",
    creationDate: "2021-6-10 19:34:22",
  },
  {
    id: "1003",
    bucketName: "bucket-animal",
    bucketRegion: "us-east-5",
    creationDate: "2021-8-10 19:34:22",
  },
];

export const CFIngestList = [
  { name: "date", value: "date", isChecked: true, disabled: true },
  { name: "time", value: "time", isChecked: true, disabled: true },
  {
    name: "x-edge-location",
    value: "x-edge-location",
    isChecked: false,
    disabled: false,
  },
  { name: "sc-bytes", value: "sc-bytes", isChecked: false, disabled: false },
  { name: "c-ip", value: "c-ip", isChecked: true, disabled: false },
  { name: "cs-method", value: "cs-method", isChecked: true, disabled: false },
  { name: "cs(Host)", value: "cs(Host)", isChecked: false, disabled: false },
  {
    name: "cs-uri-stem",
    value: "cs-uri-stem",
    isChecked: false,
    disabled: false,
  },
  { name: "sc-status", value: "sc-status", isChecked: true, disabled: false },
  {
    name: "cs(Referer)",
    value: "cs(Referer)",
    isChecked: false,
    disabled: false,
  },
  {
    name: "cs(User-Agent)",
    value: "cs(User-Agent)",
    isChecked: false,
    disabled: false,
  },
  {
    name: "cs-uri-query",
    value: "cs-uri-query",
    isChecked: true,
    disabled: false,
  },
];

export const CFLocationList = [
  {
    name: "geo_location",
    value: "geo_location",
  },
  {
    name: "geo_country",
    value: "geo_country",
  },
  {
    name: "geo_iso_code",
    value: "geo_iso_code",
  },
  {
    name: "geo_city",
    value: "geo_city",
  },
];

export const CFOSAgentList = [
  {
    name: "ua_browser",
    value: "ua_browser",
  },
  {
    name: "ua_browser_version",
    value: "ua_browser_version",
  },
  {
    name: "ua_os",
    value: "ua_os",
  },
  {
    name: "ua_os_version",
    value: "ua_os_version",
  },
  {
    name: "ua_device",
    value: "ua_device",
  },
  {
    name: "ua_category",
    value: "ua_category",
  },
];
