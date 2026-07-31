import * as v from 'valibot';
import { currentPassword, email, password, requiredText } from './common';

export const loginSchema = v.object({
	email,
	password: v.pipe(
		v.string(),
		v.nonEmpty('Password is required.'),
		v.maxLength(25, 'Password must be 25 characters or fewer.')
	)
});

export const forgotPasswordSchema = v.object({ email });

export const resetPasswordSchema = v.object({
	token: requiredText('Reset token', 2048),
	password
});

export const setPasswordSchema = resetPasswordSchema;

export const changePasswordSchema = v.pipe(
	v.object({
		currentPassword,
		password
	}),
	v.forward(
		v.partialCheck(
			[['currentPassword'], ['password']],
			(input) => input.currentPassword !== input.password,
			'Choose a password different from the current password.'
		),
		['password']
	)
);
