import React from "react";
import SpecifyOpenSearchCluster, {
  SpecifyOpenSearchClusterProps,
} from "./SpecifyCluster";
import ConfigLightEngine, {
} from "./ConfigLightEngine";

export const enum AnalyticEngineTypes {
  OPENSEARCH = "OPENSEARCH",
  LIGHT_ENGINE = "LIGHT_ENGINE",
}

type SpecifyAnalyticsEngineProps = SpecifyOpenSearchClusterProps & {
  engineType: AnalyticEngineTypes;
};

const SpecifyAnalyticsEngine = (props: SpecifyAnalyticsEngineProps) => {
  const { engineType, ...aosProps } = props;

  return (
    <div>
      {engineType === AnalyticEngineTypes.OPENSEARCH && (
        <SpecifyOpenSearchCluster {...aosProps} />
      )}
      {engineType === AnalyticEngineTypes.LIGHT_ENGINE && (
        <ConfigLightEngine />
      )}
    </div>
  );
};

export default SpecifyAnalyticsEngine;
