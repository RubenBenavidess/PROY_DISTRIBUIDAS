import { SchemaOptions } from 'mongoose';

/** Configuraciones globales de los modelos */
export const makeOptions = <IUser>(): SchemaOptions<IUser> => ({
    versionKey: false,
    timestamps: true,
});

export const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i;