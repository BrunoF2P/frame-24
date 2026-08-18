export interface PersonProps {
  id: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  birthDate: Date | null;
  createdAt: Date;
}

export class Person {
  private constructor(private readonly props: PersonProps) {}

  static create(props: PersonProps): Person {
    return new Person(props);
  }

  get id(): string {
    return this.props.id;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get email(): string | null {
    return this.props.email;
  }

  get mobile(): string | null {
    return this.props.mobile;
  }
}
