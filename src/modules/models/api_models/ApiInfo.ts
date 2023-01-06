/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import ApiResultRecord from "./ApiResultRecord";
import { MESSAGE_IMPORTANCE, RESULT_STATUSES } from "../../components/common_components/enumerations";

/**
 * Holds information about the progress of the executed SFDC API callouts
 */
export default class ApiInfo {

  constructor(init?: Partial<ApiInfo>) {
    Object.assign(this, init);
    this.resultRecords = this.resultRecords || new Array<ApiResultRecord>();
  }

  sObjectName: string;
  strOperation: string;

  contentUrl: string;

  job: any;
  jobId: string;
  batchId: string;
  jobState: "Undefined" | "Info" | "OperationStarted" | "OperationFinished" | "Open" | "Closed" | "Aborted" | "Failed" | "UploadStart" | "UploadComplete" | "InProgress" | "JobComplete" = "Undefined";

  errorMessage: string;
  errorStack: string;

  numberRecordsProcessed: number;
  numberRecordsFailed: number;

  resultRecords: Array<ApiResultRecord>;
  informationMessageData: Array<string> = new Array<string>();

  get messageImportance(): MESSAGE_IMPORTANCE {

    switch (this.resultStatus) {

      // Silent
      default:
        return MESSAGE_IMPORTANCE.Silent;

      // Normal
      case RESULT_STATUSES.ApiOperationStarted:
      case RESULT_STATUSES.ApiOperationFinished:
        return MESSAGE_IMPORTANCE.Normal;

      // Low
      case RESULT_STATUSES.InProgress:
      case RESULT_STATUSES.DataUploaded:
      case RESULT_STATUSES.BatchCreated:
      case RESULT_STATUSES.JobCreated:
        return MESSAGE_IMPORTANCE.Low;

      // Warn
      case RESULT_STATUSES.Completed:
        if (this.numberRecordsFailed == 0)
          return MESSAGE_IMPORTANCE.Normal;
        else
          return MESSAGE_IMPORTANCE.Warn;

      // Error
      case RESULT_STATUSES.ProcessError:
      case RESULT_STATUSES.FailedOrAborted:
        return MESSAGE_IMPORTANCE.Error;

    }
  }

  get resultStatus(): RESULT_STATUSES {

    if (!!this.errorMessage) {
      return RESULT_STATUSES.ProcessError;
    }

    switch (this.jobState) {

      default:
        return RESULT_STATUSES.Undefined;

      case "Info":
        return RESULT_STATUSES.Information;

      case "OperationStarted":
        return RESULT_STATUSES.ApiOperationStarted;

      case "OperationFinished":
        return RESULT_STATUSES.ApiOperationFinished;

      case "Open":
        return RESULT_STATUSES.JobCreated;

      case "UploadStart":
        return RESULT_STATUSES.BatchCreated;

      case "UploadComplete":
        return RESULT_STATUSES.DataUploaded;

      case "InProgress":
      case "Closed":
        return RESULT_STATUSES.InProgress;

      case "Aborted":
      case "Failed":
        return RESULT_STATUSES.FailedOrAborted;

      case "JobComplete":
        return RESULT_STATUSES.Completed;
    }
  }
}
