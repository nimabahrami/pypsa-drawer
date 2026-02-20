// js/history.js — Undo/Redo System

export class History {
    constructor(app, maxSize = 50) {
        this.app = app;
        this.stack = [];
        this.pointer = -1;
        this.maxSize = maxSize;
        this.ignoring = false;
    }

    push() {
        if (this.ignoring) return;
        const state = this.app.canvas.serialize();
        // Trim future states
        this.stack = this.stack.slice(0, this.pointer + 1);
        this.stack.push(JSON.stringify(state));
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        }
        this.pointer = this.stack.length - 1;
    }

    undo() {
        if (this.pointer <= 0) return;
        this.pointer--;
        this._restore();
    }

    redo() {
        if (this.pointer >= this.stack.length - 1) return;
        this.pointer++;
        this._restore();
    }

    _restore() {
        this.ignoring = true;
        const state = JSON.parse(this.stack[this.pointer]);
        this.app.canvas.restore(state);
        this.app.onComponentsChanged();
        this.ignoring = false;
    }

    canUndo() { return this.pointer > 0; }
    canRedo() { return this.pointer < this.stack.length - 1; }
}
