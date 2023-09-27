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

import { useState } from "react";

const useError = () => useState("");

export class Validator {
  public error: string;
  private setError: React.Dispatch<React.SetStateAction<string>>;

  constructor(private onValidate: () => void) {
    const [error, setError] = useError();
    this.error = error;
    this.setError = setError;
  }

  public validate(): boolean {
    try {
      this.onValidate();
      this.setError("");
    } catch (e: any) {
      this.setError(e.message);
      return false;
    }
    return true;
  }
}
