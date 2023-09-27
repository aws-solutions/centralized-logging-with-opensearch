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
import React, { ReactElement } from "react";
import { withStyles } from "@material-ui/core/styles";
import Dialog from "@material-ui/core/Dialog";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";

const styles: any = (theme: any) => ({
  root: {
    margin: 0,
    background: "#f5f5f5",
    fontWeight: "bold",
    padding: "14px 20px 13px",
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(0),
    top: theme.spacing(0),
    color: theme.palette.grey[500],
  },
});

const DialogContent = withStyles(() => ({
  root: {
    padding: 0,
  },
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
}))(MuiDialogActions);

const DialogTitle = withStyles(styles)((props: any) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography>
        <b>{children}</b>
      </Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

interface ModalProps {
  title: string;
  isOpen: boolean;
  fullWidth: boolean;
  closeModal: () => void;
  children: ReactElement;
  actions: ReactElement;
  width?: number;
}

const Modal: React.FC<ModalProps> = (props: ModalProps) => {
  const { title, isOpen, fullWidth, closeModal, children, actions, width } =
    props;
  const handleClose = (event: any, reason: string) => {
    console.info("reason:", reason);
    if (reason !== "backdropClick") {
      closeModal();
    }
  };
  return (
    <Dialog
      fullWidth={fullWidth}
      maxWidth={fullWidth ? "md" : "sm"}
      onClose={handleClose}
      aria-labelledby="customized-dialog-title"
      open={isOpen}
    >
      <DialogTitle id="customized-dialog-title" onClose={handleClose}>
        {title}
      </DialogTitle>
      <DialogContent dividers style={{ width: width ? width : "auto" }}>
        {children}
      </DialogContent>
      <DialogActions>{actions}</DialogActions>
    </Dialog>
  );
};

export default Modal;
