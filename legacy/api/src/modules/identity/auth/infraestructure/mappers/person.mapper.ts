import { persons } from '@repo/db';
import { Person, PersonProps } from '../../domain/entities/person.entity';

export class PersonMapper {
  static toDomain(raw: persons): Person {
    const props: PersonProps = {
      id: raw.id,
      fullName: raw.full_name,
      email: raw.email,
      mobile: raw.mobile,
      birthDate: raw.birth_date,
      createdAt: raw.created_at ?? new Date(),
    };

    return Person.create(props);
  }
}
