// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from "pages/comps/Validator";
import { useEffect, useRef } from "react";

export const useAutoValidation = (validator: Validator, dep: any[]) => {
  const notInitialRender = useRef(false);
  useEffect(() => {
    // skip first render
    if (notInitialRender.current) {
      validator.validate();
    } else {
      notInitialRender.current = true;
    }
  }, dep);
};
