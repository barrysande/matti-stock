import { config, forward, maxLength, nonEmpty, object, partialCheck, pipe, string } from 'valibot';
import { currentPassword, email, password, requiredText } from './common';

export const loginSchema = object({
	email,
	password: config(
		pipe(
			string(),
			nonEmpty('Password is required.'),
			maxLength(25, 'Password must be 25 characters or fewer.')
		),
		{ abortPipeEarly: true }
	)
});

export const forgotPasswordSchema = object({ email });

export const resetPasswordSchema = object({
	token: requiredText('Reset token', 2048),
	password
});

export const setPasswordSchema = resetPasswordSchema;

export const changePasswordSchema = pipe(
	object({
		currentPassword,
		password
	}),
	forward(
		partialCheck(
			[['currentPassword'], ['password']],
			(input) => input.currentPassword !== input.password,
			'Choose a password different from the current password.'
		),
		['password']
	)
);
