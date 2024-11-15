import { remult } from '../../core/src/remult-proxy'
import {
  EntityUIInfo,
  FieldRelationToOneInfo,
  FieldUIInfo,
} from '../../core/server/remult-admin'
import { Repository } from '../../core/src/remult3/remult3'
import { Fields } from '../../core/src/remult3/Fields'
import { Entity } from '../../core/src/remult3/entity'
import { TLSContext } from './lib/stores/LSContext.js'

const generateHslColors = (numColors: number): string[] => {
  const colors = []
  // const saturation = 70 // Adjust as needed
  // const lightness = 50 // Adjust as needed

  for (let i = 0; i < numColors; i++) {
    const hue = (i * 360) / numColors
    // colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
    colors.push(hue)
  }

  return colors
}

export type TableInfo = EntityUIInfo & { repo: Repository<any> }
export class God {
  async getItemsForSelect(
    relation: FieldRelationToOneInfo,
    search: string | undefined,
  ) {
    const t = this.tables.find((t) => t.key == relation.entityKey)
    if (!t) return { items: [], $count: 0 }
    const repo = t.repo

    const where = search
      ? { [relation.captionField]: { $contains: search } }
      : undefined

    const [items, agg] = await Promise.all([
      repo.find({
        limit: 11,
        orderBy: {
          [relation.captionField]: 'asc',
        },
        where,
      }),
      repo.count(where),
    ])

    return {
      items: items.map((x) => ({
        id: x[relation.idField],
        caption: x[relation.captionField],
      })),
      $count: agg,
    }
  }
  async displayValueFor(field: FieldUIInfo, value: any) {
    const relations = field.relationToOne!

    const t = this.tables.find((t) => t.key == relations.entityKey)
    if (!t) return 'Forbidden - ' + value

    const item = await t.repo.findId(value)

    if (!item) {
      if (value !== undefined) {
        return 'not found - ' + value
      }
      return `-`
    }

    if (!item[relations.captionField])
      return `Can't display ${relations.captionField} - ${value}`

    return item[relations.captionField]
  }
  async displayValueForEach(field: FieldUIInfo, values: any[]) {
    const relations = field.relationToOne!

    const t = this.tables.find((t) => t.key == relations.entityKey)
    if (!t)
      return {
        [field.valFieldKey]: new Map(
          values.map((x) => [
            x[field.valFieldKey],
            `Forbidden (${x[field.valFieldKey]})`,
          ]),
        ),
      }

    const items = await t.repo.find({
      where: {
        [relations.idField]: { $in: values.map((x) => x[field.valFieldKey]) },
      },
    })

    if (!items || items.length == 0) {
      return {
        [field.valFieldKey]: new Map(
          values.map((x) => [
            x[field.valFieldKey],
            `not found (${x[field.valFieldKey]})`,
          ]),
        ),
      }
    }
    return {
      [field.valFieldKey]: new Map(
        items.map((item) => [item.id, item[relations.captionField]]),
      ),
    }
  }
  tables: TableInfo[]
  constructor(myEntities: EntityUIInfo[]) {
    const colors = generateHslColors(myEntities.length)
    // @ts-ignore
    this.tables = myEntities
      .sort((a, b) => a.caption.localeCompare(b.caption))
      .map((info, i) => {
        info.color = colors[i % colors.length]
        class C {}
        for (const f of info.fields) {
          switch (f.type) {
            case 'json':
              Fields.json()(C.prototype, f.key as keyof typeof C.prototype)
              break
            case 'number':
              Fields.number()(C.prototype, f.key)
              break
            case 'boolean':
              Fields.boolean()(C.prototype, f.key)
              break
            default:
              Fields.string()(C.prototype, f.key)
              break
          }
        }
        Entity(info.key, {
          allowApiCrud: true,
          caption: info.caption,
          id: info.ids,
        })(C)
        return {
          ...info,
          repo: remult.repo(C),
        }
      })
  }

  getTables(ctx: TLSContext) {
    return (this.tables ?? []).filter((c) =>
      (ctx.settings.dispayCaption ? c.caption : c.key)
        .toLowerCase()
        .includes(ctx.settings.search.toLowerCase()),
    )
  }
}
