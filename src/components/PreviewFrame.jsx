import React from 'react';
import Bowser from 'bowser';
import bindAll from 'lodash/bindAll';
import normalizeError from '../util/normalizeError';
import {sourceDelimiter} from '../util/generatePreview';
import loopProtect from 'loop-protect';

class PreviewFrame extends React.Component {
  constructor() {
    super();
    bindAll(this, '_onMessage');
  }

  componentDidMount() {
    window.addEventListener('message', this._onMessage);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.src !== this.props.src) {
      this._writeFrameContents(nextProps.src);
      nextProps.frameWillRefresh();
    }
  }

  shouldComponentUpdate() {
    return false;
  }

  componentWillUnmount() {
    window.removeEventListener('message', this._onMessage);
  }

  _saveFrame(frame) {
    this.frame = frame;
    this._writeFrameContents(this.props.src);
  }

  _writeFrameContents(src) {
    if (!this.frame) {
      return;
    }

    const frameDocument = this.frame.contentDocument;
    frameDocument.open();
    this.frame.contentWindow.loopProtect = loopProtect;
    frameDocument.write(src);
    frameDocument.close();
  }

  _runtimeErrorLineOffset() {
    if (Bowser.safari || Bowser.chrome) {
      return 2;
    }

    const firstSourceLine = this.props.src.
      split('\n').indexOf(sourceDelimiter) + 2;

    return firstSourceLine - 1;
  }

  _onMessage(message) {
    if (typeof message.data !== 'string') {
      return;
    }

    let data;
    try {
      data = JSON.parse(message.data);
    } catch (_e) {
      return;
    }

    if (data.type !== 'org.popcode.error') {
      return;
    }

    const ErrorConstructor = window[data.error.name] || Error;
    const error = new ErrorConstructor(data.error.message);

    const normalizedError = normalizeError(error);

    this.props.onRuntimeError({
      reason: normalizedError.type,
      text: normalizedError.message,
      raw: normalizedError.message,
      row: data.error.line - this._runtimeErrorLineOffset() - 1,
      column: data.error.column,
      type: 'error',
    });
  }

  render() {
    return (
      <iframe
        className="preview-frame"
        ref={this._saveFrame.bind(this)}
      />
    );
  }
}

PreviewFrame.propTypes = {
  src: React.PropTypes.string.isRequired,
  frameWillRefresh: React.PropTypes.func.isRequired,
  onRuntimeError: React.PropTypes.func.isRequired,
};


export default PreviewFrame;
