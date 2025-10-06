export class StateMachine<T> {
  constructor(
    private currentState: T,
    private readonly transitions: Map<T, StaticArray<T>>
  ) {}

  protected get state(): T {
    return this.currentState;
  }

  protected setState(newState: T): boolean {
    if (this.currentState === newState) return false;
    if (this.transitions.get(this.currentState).includes(newState)) {
      const oldState = this.currentState;
      this.onStateChanged((this.currentState = newState), oldState);
      return true;
    }
    return false;
  }

  protected onStateChanged(newState: T, oldState: T): void {}
}
