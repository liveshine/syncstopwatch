const { formatTime } = require('../public/utils');

describe('formatTime', () => {
  it('handles 0 ms correctly', () => {
    const result = formatTime(0);
    expect(result).toEqual({ h: '00', m: '00', s: '00', msec: '000' });
  });

  it('handles negative values correctly', () => {
    const result = formatTime(-500);
    expect(result).toEqual({ h: '00', m: '00', s: '00', msec: '000' });
  });

  it('handles values less than a second correctly', () => {
    const result = formatTime(500);
    expect(result).toEqual({ h: '00', m: '00', s: '00', msec: '500' });
  });

  it('handles exactly one second correctly', () => {
    const result = formatTime(1000);
    expect(result).toEqual({ h: '00', m: '00', s: '01', msec: '000' });
  });

  it('handles exactly one minute correctly', () => {
    const result = formatTime(60000);
    expect(result).toEqual({ h: '00', m: '01', s: '00', msec: '000' });
  });

  it('handles exactly one hour correctly', () => {
    const result = formatTime(3600000);
    expect(result).toEqual({ h: '01', m: '00', s: '00', msec: '000' });
  });

  it('handles combined values correctly (e.g. 1h 1m 1s 500ms)', () => {
    const result = formatTime(3661500);
    expect(result).toEqual({ h: '01', m: '01', s: '01', msec: '500' });
  });
});
