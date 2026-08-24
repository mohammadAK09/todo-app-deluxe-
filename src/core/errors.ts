export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class ForbiddenError extends Error {
    constructor(message = 'Not allowed') {
        super(message);
        this.name = 'ForbiddenError';
    }
}