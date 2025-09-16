import { Meteor } from 'meteor/meteor';
import { SHA256 } from 'meteor/sha';
import toastr from 'toastr';

import { modal } from '../../ui-utils/client';
import { t, APIClient } from '../../utils/client';

const methods = {
	totp: {
		text: 'Open_your_authentication_app_and_enter_the_code',
	},
	email: {
		text: 'Verify_your_email_for_the_code_we_sent',
		html: true,
	},
	password: {
		title: 'Please_enter_your_password',
		text: 'For_your_security_you_must_enter_your_current_password_to_continue',
		inputType: 'password',
	},
};

export function process2faReturn({ error, result, originalCallback, onCode, emailOrUsername }) {
	if (!error || (error.error !== 'totp-required' && error.errorType !== 'totp-required')) {
		return originalCallback(error, result);
	}

	const method = error.details && error.details.method;

	if (!emailOrUsername && Meteor.user()) {
		emailOrUsername = Meteor.user().username;
	}

	modal.open({
		title: t(methods[method].title || 'Two Factor Authentication'),
		text: t(methods[method].text),
		html: methods[method].html,
		type: 'input',
		inputActionText: method === 'email' && t('Send_me_the_code_again'),
		async inputAction(e) {
			const { value } = e.currentTarget;
			e.currentTarget.value = t('Sending');

			await APIClient.v1.post('users.2fa.sendEmailCode', { emailOrUsername });

			e.currentTarget.value = value;
		},
		inputType: methods[method].inputType || 'text',
		showCancelButton: true,
		closeOnConfirm: true,
		confirmButtonText: t('Verify'),
		cancelButtonText: t('Cancel'),
	}, (code) => {
		if (code === false) {
			return originalCallback(new Meteor.Error('totp-canceled'));
		}

		if (method === 'password') {
			code = SHA256(code);
		}
		onCode(code, method);
	});
}

// const { call } = Meteor;
// Meteor.call = function(ddpMethod, ...args) {
// 	let callback = args.pop();
// 	if (typeof callback !== 'function') {
// 		args.push(callback);
// 		callback = () => {};
// 	}

// 	return call(ddpMethod, ...args, function(error, result) {
// 		process2faReturn({
// 			error,
// 			result,
// 			originalCallback: callback,
// 			onCode: (code, method) => {
// 				call(ddpMethod, ...args, { twoFactorCode: code, twoFactorMethod: method }, (error, result) => {
// 					if (error && error.error === 'totp-invalid') {
// 						error.toastrShowed = true;
// 						toastr.error(t('Invalid_two_factor_code'));
// 						return callback(error);
// 					}

// 					callback(error, result);
// 				});
// 			},
// 		});
// 	});
// };

Meteor.call = function (ddpMethod, ...args) {
  let callback = args.pop();
  if (typeof callback !== 'function') {
    args.push(callback);
    callback = () => {};
  }

  const messageId = Random.id();

  const ddpMessage = {
    msg: 'method',
    method: ddpMethod,
    params: args,
    id: messageId,
  };

  const endpoint = Meteor.userId() ? 'method.call' : 'method.callAnon';

  const doRestCall = (params, cb) => {
    const messageToSend = { ...ddpMessage, params };
    const payload = { message: DDPCommon.stringifyDDP(messageToSend) };

    // Fallback: ensure _methodInvokers exists
    if (!Meteor.connection._methodInvokers) {
      Meteor.connection._methodInvokers = {};
    }

    // If a valid MethodInvoker class is available, use it; else set a minimal stub
    let invokerUsable = false;
    let invoker;
    try {
      const invokers = Meteor.connection._methodInvokers;
      if (Object.keys(invokers).length > 0) {
        const first = invokers[Object.keys(invokers)[0]];
        if (first && typeof first.constructor === 'function') {
          const MethodInvoker = first.constructor;
          invoker = new MethodInvoker(Meteor.connection, messageId, ddpMethod, params, cb);
          invokerUsable = true;
        }
      }
    } catch (e) {
      invokerUsable = false;
    }

    if (invokerUsable && invoker) {
      Meteor.connection._methodInvokers[messageId] = invoker;
    } else {
      // fallback stub so at least callback won't crash
      Meteor.connection._methodInvokers[messageId] = {
        callback: cb,
        dataVisible() { return true; },
        result() { return null; },
        error() { return null; },
        _message: messageToSend
      };
    }

    APIClient.v1
      .post(`${endpoint}/${encodeURIComponent(ddpMethod)}`, payload)
      .then(({ message }) => {
        // const parsed = typeof message === 'string' ? DDPCommon.parseDDP(message) : message;
		const parsed = DDPCommon.parseDDP(message);

        // If we have valid internals, simulate result & updated
        // if (Meteor.connection.onMessage) {
        //   Meteor.connection.onMessage({
        //     msg: 'result',
        //     id: messageId,
        //     result: parsed.result,
        //   });
        //   Meteor.connection.onMessage({
        //     msg: 'updated',
        //     methods: [messageId],
        //   });
        // }

        // Also always call callback, so client code works
        cb(null, parsed.result);
      })
      .catch((error) => {
        const sanitizedError = {
          error: error.error || error.message || 'unknown-error',
          reason: error.reason || error.message || String(error),
          details: error.details,
          message: error.message,
          errorType: error.errorType,
        };

        if (Meteor.connection.onMessage) {
          Meteor.connection.onMessage({
            msg: 'result',
            id: messageId,
            error: sanitizedError,
          });
        }
        cb(sanitizedError);
      });
  };

  doRestCall(args, (error, result) => {
    process2faReturn({
      error,
      result,
      originalCallback: callback,
      onCode: (code, method) => {
        const extParams = [...args, {
          twoFactorCode: code,
          twoFactorMethod: method,
        }];
        doRestCall(extParams, callback);
      }
    });
  });
};
