import type { Remult } from '../../core/src/context'
import { Entity, EntityBase, Fields } from '../../core/src/remult3'

@Entity('c', { allowApiCrud: true })
export class c extends EntityBase {
  @Fields.integer()
  id: number
  @Fields.string()
  name: string
  constructor(private remult: Remult) {
    super()
  }
}
