// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

onmessage = function (e) {
  const { pattern, text } = e.data;
  try {
    const result = RegExp(pattern).exec(text);
    postMessage({ result });
  } catch (error) {
    postMessage({ error: error.message });
  }
};
