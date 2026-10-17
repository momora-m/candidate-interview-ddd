export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  public equals(vo?: ValueObject<TProps> | null): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.constructor !== this.constructor) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  public toJSON(): TProps {
    return { ...this.props };
  }
}
