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
import React from "react";

type StepType = {
  name: string;
};
interface CreateStepProps {
  className?: string;
  activeIndex: number;
  selectStep?: (step: number) => void;
  list: StepType[];
}

export const CreateStep: React.FC<CreateStepProps> = (
  props: CreateStepProps
) => {
  const { list, activeIndex, selectStep } = props;

  // btn, btn-lg, btn-primary
  return (
    <div className="gsui-create-step">
      <nav>
        <ul>
          {list.map((element, index) => {
            return (
              <li key={element.name}>
                <small>Step {index + 1}</small>
                <div className="step-name">
                  <span
                    onClick={() => {
                      selectStep && selectStep(index);
                    }}
                    className={activeIndex !== index ? "link" : ""}
                  >
                    {element.name}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

CreateStep.defaultProps = {
  className: "",
};

export default CreateStep;
