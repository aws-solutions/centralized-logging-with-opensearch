// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { TextEncoder } from "node:util";

global.TextEncoder = TextEncoder;
jest.setTimeout(30000);
