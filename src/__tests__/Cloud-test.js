/**
 * Copyright (c) 2015-present, Parse, LLC.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

jest.dontMock('../Cloud');
jest.dontMock('../CoreManager');
jest.dontMock('../decode');
jest.dontMock('../encode');
jest.dontMock('../ParseError');
jest.dontMock('../ParseObject');
jest.dontMock('../ParseQuery');
jest.dontMock('../Push');
jest.dontMock('../parseDate');
jest.dontMock('../ObjectStateMutations');
jest.dontMock('../SingleInstanceStateController');
jest.dontMock('../UniqueInstanceStateController');

const Cloud = require('../Cloud');
const CoreManager = require('../CoreManager');
const Push = require('../Push');
const ParseObject = require('../ParseObject').default;

const defaultController = CoreManager.getCloudController();

describe('Cloud', () => {
  beforeEach(() => {
    ParseObject.enableSingleInstance();

    const run = jest.fn();
    const getJobsData = jest.fn();
    const startJob = jest.fn();
    run.mockReturnValue(
      Promise.resolve({
        result: {},
      })
    );
    getJobsData.mockReturnValue(
      Promise.resolve({
        result: {},
      })
    );
    startJob.mockReturnValue(
      Promise.resolve({
        result: {},
      })
    );
    CoreManager.setCloudController({ run, getJobsData, startJob });
  });

  it('run throws with an invalid function name', () => {
    expect(Cloud.run).toThrow('Cloud function name must be a string.');

    expect(Cloud.run.bind(null, '')).toThrow('Cloud function name must be a string.');

    expect(Cloud.run.bind(null, {})).toThrow('Cloud function name must be a string.');
  });

  it('run passes function name and data along', () => {
    Cloud.run('myfunction', {});

    expect(CoreManager.getCloudController().run.mock.calls[0]).toEqual(['myfunction', {}, {}]);
  });

  it('run passes options', () => {
    Cloud.run('myfunction', {}, { useMasterKey: false });

    expect(CoreManager.getCloudController().run.mock.calls[0]).toEqual(['myfunction', {}, {}]);

    Cloud.run('myfunction', {}, { useMasterKey: true });

    expect(CoreManager.getCloudController().run.mock.calls[1]).toEqual([
      'myfunction',
      {},
      { useMasterKey: true },
    ]);

    Cloud.run('myfunction', {}, { sessionToken: 'asdf1234' });

    expect(CoreManager.getCloudController().run.mock.calls[2]).toEqual([
      'myfunction',
      {},
      { sessionToken: 'asdf1234' },
    ]);

    Cloud.run('myfunction', {}, { useMasterKey: true, sessionToken: 'asdf1234' });

    expect(CoreManager.getCloudController().run.mock.calls[3]).toEqual([
      'myfunction',
      {},
      { useMasterKey: true, sessionToken: 'asdf1234' },
    ]);
  });

  it('startJob throws with an invalid job name', () => {
    expect(Cloud.startJob).toThrow('Cloud job name must be a string.');

    expect(Cloud.startJob.bind(null, '')).toThrow('Cloud job name must be a string.');

    expect(Cloud.startJob.bind(null, {})).toThrow('Cloud job name must be a string.');
  });

  it('startJob passes function name and data along', () => {
    Cloud.startJob('myJob', {});

    expect(CoreManager.getCloudController().startJob.mock.calls[0]).toEqual([
      'myJob',
      {},
      { useMasterKey: true },
    ]);
  });

  it('startJob passes options', () => {
    Cloud.startJob('myJob', {}, { useMasterKey: true });

    expect(CoreManager.getCloudController().startJob.mock.calls[0]).toEqual([
      'myJob',
      {},
      { useMasterKey: true },
    ]);
  });

  it('getJobsData passes options', () => {
    Cloud.getJobsData();

    expect(CoreManager.getCloudController().getJobsData.mock.calls[0]).toEqual([
      { useMasterKey: true },
    ]);

    Cloud.getJobsData({ useMasterKey: true });

    expect(CoreManager.getCloudController().getJobsData.mock.calls[0]).toEqual([
      { useMasterKey: true },
    ]);
  });
});

describe('CloudController', () => {
  beforeEach(() => {
    CoreManager.setCloudController(defaultController);
    const request = jest.fn();
    request.mockReturnValue(
      Promise.resolve({
        success: true,
        result: {},
      })
    );
    const ajax = jest.fn();
    CoreManager.setRESTController({ request: request, ajax: ajax });
  });

  it('run passes encoded requests', () => {
    Cloud.run('myfunction', {
      value: 12,
      when: new Date(Date.UTC(2015, 0, 1)),
    });

    expect(CoreManager.getRESTController().request.mock.calls[0]).toEqual([
      'POST',
      'functions/myfunction',
      {
        value: 12,
        when: { __type: 'Date', iso: '2015-01-01T00:00:00.000Z' },
      },
      {},
    ]);
  });

  it('run passes options', () => {
    Cloud.run('myfunction', { value: 12 }, { useMasterKey: true });

    expect(CoreManager.getRESTController().request.mock.calls[0]).toEqual([
      'POST',
      'functions/myfunction',
      {
        value: 12,
      },
      { useMasterKey: true },
    ]);

    Cloud.run('myfunction', { value: 12 }, { sessionToken: 'asdf1234' });

    expect(CoreManager.getRESTController().request.mock.calls[1]).toEqual([
      'POST',
      'functions/myfunction',
      {
        value: 12,
      },
      { sessionToken: 'asdf1234' },
    ]);
  });

  it('run invalid response', done => {
    const request = jest.fn();
    request.mockReturnValue(
      Promise.resolve({
        success: false,
      })
    );
    const ajax = jest.fn();
    CoreManager.setRESTController({ request: request, ajax: ajax });

    Cloud.run('myfunction')
      .then(null)
      .catch(() => {
        done();
      });
  });

  it('run undefined response', done => {
    const request = jest.fn();
    request.mockReturnValue(Promise.resolve(undefined));

    const ajax = jest.fn();
    CoreManager.setRESTController({ request: request, ajax: ajax });

    Cloud.run('myfunction').then(() => {
      done();
    });
  });

  it('run same function twice with different responses', async () => {
    const request = jest.fn();
    request.mockReturnValue(
      Promise.resolve({
        success: true,
        result: {
          objectId: 'abc123',
          className: 'Item',
          __type: 'Object',
          createdAt: '2015-01-01T00:00:00.000Z',
          updatedAt: '2015-01-01T00:00:00.000Z',
          label: 'foobar',
        },
      })
    );

    const ajax = jest.fn();
    CoreManager.setRESTController({ request: request, ajax: ajax });

    const response1 = await Cloud.run('myfunction');
    expect(response1.get('label')).toBe('foobar');

    request.mockReturnValue(
      Promise.resolve({
        success: true,
        result: {
          objectId: 'abc123',
          className: 'Item',
          __type: 'Object',
          createdAt: '2015-01-01T00:00:00.000Z',
          updatedAt: '2015-01-01T00:00:00.000Z',
          label2: 'control to confirm correct mock usage',
          // Note that 'label' is not returned
        },
      })
    );

    const response2 = await Cloud.run('myfunction');
    expect(response2.get('label2')).toBe('control to confirm correct mock usage');
    expect(response2.get('label')).toBe(undefined); // Failing test PR #1442
  });

  it('startJob passes encoded requests', () => {
    Cloud.startJob('myJob', {
      value: 12,
      when: new Date(Date.UTC(2015, 0, 1)),
    });

    expect(CoreManager.getRESTController().request.mock.calls[0]).toEqual([
      'POST',
      'jobs/myJob',
      {
        value: 12,
        when: { __type: 'Date', iso: '2015-01-01T00:00:00.000Z' },
      },
      { useMasterKey: true },
    ]);
  });

  it('startJob passes options', () => {
    Cloud.startJob('myJob', { value: 12 }, { useMasterKey: true });

    expect(CoreManager.getRESTController().request.mock.calls[0]).toEqual([
      'POST',
      'jobs/myJob',
      {
        value: 12,
      },
      { useMasterKey: true },
    ]);
  });

  it('getJobsData passes no options', () => {
    Cloud.getJobsData();

    expect(CoreManager.getRESTController().request.mock.calls[0]).toEqual([
      'GET',
      'cloud_code/jobs/data',
      null,
      { useMasterKey: true },
    ]);
  });

  it('getJobsData passes options', () => {
    Cloud.getJobsData({ useMasterKey: true });

    expect(CoreManager.getRESTController().request.mock.calls[0]).toEqual([
      'GET',
      'cloud_code/jobs/data',
      null,
      { useMasterKey: true },
    ]);
  });

  it('accepts context on cloud function call', async () => {
    const request = jest.fn();
    request.mockReturnValue(Promise.resolve(undefined));

    const ajax = jest.fn();
    CoreManager.setRESTController({ request: request, ajax: ajax });

    // Spy on REST controller
    const controller = CoreManager.getRESTController();
    jest.spyOn(controller, 'request');
    // Save object
    const context = { a: 'a' };
    await Cloud.run('myfunction', {}, { context: context });
    // Validate
    expect(controller.request.mock.calls[0][3].context).toEqual(context);
  });

  it('can get job status', async () => {
    const request = jest.fn();
    request.mockReturnValue(
      Promise.resolve({
        results: [{ className: '_JobStatus', objectId: 'jobId1234' }],
      })
    );
    CoreManager.setRESTController({ request: request, ajax: jest.fn() });

    await Cloud.getJobStatus('jobId1234');
    const [method, path, data, options] = request.mock.calls[0];
    expect(method).toBe('GET');
    expect(path).toBe('classes/_JobStatus');
    expect(data).toEqual({
      limit: 1,
      where: {
        objectId: 'jobId1234',
      },
    });
    expect(options.useMasterKey).toBe(true);
  });

  it('can get push status', async () => {
    const request = jest.fn();
    request.mockReturnValue(
      Promise.resolve({
        results: [{ className: '_PushStatus', objectId: 'pushId1234' }],
      })
    );
    CoreManager.setRESTController({ request: request, ajax: jest.fn() });

    await Push.getPushStatus('pushId1234');
    const [method, path, data, options] = request.mock.calls[0];
    expect(method).toBe('GET');
    expect(path).toBe('classes/_PushStatus');
    expect(data).toEqual({
      limit: 1,
      where: {
        objectId: 'pushId1234',
      },
    });
    expect(options.useMasterKey).toBe(true);
  });

  it('can get push status with masterKey', async () => {
    const request = jest.fn();
    request.mockReturnValue(
      Promise.resolve({
        results: [{ className: '_PushStatus', objectId: 'pushId1234' }],
      })
    );
    CoreManager.setRESTController({ request: request, ajax: jest.fn() });

    await Push.getPushStatus('pushId1234', { useMasterKey: false });
    const [method, path, data, options] = request.mock.calls[0];
    expect(method).toBe('GET');
    expect(path).toBe('classes/_PushStatus');
    expect(data).toEqual({
      limit: 1,
      where: {
        objectId: 'pushId1234',
      },
    });
    expect(options.useMasterKey).toBe(false);
  });
});
