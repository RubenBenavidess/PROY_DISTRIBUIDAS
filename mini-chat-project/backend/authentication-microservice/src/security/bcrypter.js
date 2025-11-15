import bcrypt from "bcrypt";

export async function generateHash(data, saltRounds = 10){ //POSSIBLE LATENCY
    return await bcrypt.hash(data, saltRounds);
}

export async function compareHash(possible, hashed) {
    return await bcrypt.compare(possible, hashed);
}