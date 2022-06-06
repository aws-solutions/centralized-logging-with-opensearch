# EKS Cluster Log Analytics Process

This document is about the Process Design for **Import EKS Cluster, Create EKS Cluster Log Pipeline and Ingestion**. 
## Overview

![eks-pod-log-ingestion-overview](../../images/design-diagram/eks-pod-log-ingestion-overview.png)

## Import an EKS Cluster

![import-eks-cluster](../../images/design-diagram/import-eks-cluster.png)

## Collect Control plane logging
 
![request-create-eks-pod-log-pipeline](../../images/design-diagram/collect-control-plane-logging.png)

## Request to create pipeline and ingestion for collecting EKS cluster application logs

![request-create-eks-pod-log-pipeline-flow](../../images/design-diagram/eks-application-log-ingestion-flow.png)

**Sequence diagram: Request to create pipeline**

![request-create-eks-pod-log-pipeline-sequence](../../images/design-diagram/request-create-eks-pod-log-ingestion.png)

**Sequence diagram: The StepFunction Process**

![eks-pod-log-stfn-flow](../../images/design-diagram/eks-pod-log-stfn-flow.png)

**Sequence diagram: Create an ingested  from an existing pipeline**

![create-eks-pod-log-ingestion](../../images/design-diagram/create-eks-pod-log-ingestion.png)
