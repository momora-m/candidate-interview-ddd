import { SelectionStage } from '../application/SelectionStage';
import { Entity } from '../shared/Entity';
import { Result } from '../shared/Result';
import { InterviewFormat } from './InterviewFormat';
import { ProposedScheduleId } from './ProposedScheduleId';
import { ProposedScheduleStatus, type ProposedScheduleStatusCode } from './ProposedScheduleStatus';
import { TimeWindow } from './TimeWindow';

export const MAX_PROPOSED_SLOTS = 5;

export interface ProposedScheduleProps {
  id: ProposedScheduleId;
  stage: SelectionStage;
  slots: TimeWindow[];
  format: InterviewFormat;
  status: ProposedScheduleStatus;
  note: string;
  confirmedSlotIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProposedSchedule extends Entity<ProposedScheduleId> {
  private _stage: SelectionStage;
  private _slots: TimeWindow[];
  private _format: InterviewFormat;
  private _status: ProposedScheduleStatus;
  private _note: string;
  private _confirmedSlotIndex?: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ProposedScheduleProps) {
    super(props.id);
    this._stage = props.stage;
    this._slots = props.slots;
    this._format = props.format;
    this._status = props.status;
    this._note = props.note;
    this._confirmedSlotIndex = props.confirmedSlotIndex;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get stage(): SelectionStage {
    return this._stage;
  }

  public get slots(): ReadonlyArray<TimeWindow> {
    return this._slots;
  }

  public get format(): InterviewFormat {
    return this._format;
  }

  public get status(): ProposedScheduleStatus {
    return this._status;
  }

  public get note(): string {
    return this._note;
  }

  public get confirmedSlotIndex(): number | undefined {
    return this._confirmedSlotIndex;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public slotAt(index: number): TimeWindow | undefined {
    return this._slots[index];
  }

  public static create(props: {
    id?: ProposedScheduleId;
    stage: SelectionStage;
    slots: TimeWindow[];
    format: InterviewFormat;
    note?: string;
  }): Result<ProposedSchedule> {
    if (props.slots.length < 1 || props.slots.length > MAX_PROPOSED_SLOTS) {
      return Result.fail(`候補日は1件以上${MAX_PROPOSED_SLOTS}件以内で提示してください。`);
    }

    const buffer = props.format.travelBufferMinutes;
    for (let i = 0; i < props.slots.length; i += 1) {
      for (let j = i + 1; j < props.slots.length; j += 1) {
        if (props.slots[i].overlapsWithBuffers(props.slots[j], buffer, buffer)) {
          return Result.fail('提示する候補日どうしが、時間または移動・準備バッファで重なっています。');
        }
      }
    }

    const id = props.id || ProposedScheduleId.create().getValue();
    const now = new Date();
    return Result.ok(
      new ProposedSchedule({
        id,
        stage: props.stage,
        slots: [...props.slots],
        format: props.format,
        status: ProposedScheduleStatus.pending(),
        note: props.note?.trim() ?? '',
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  public static hydrate(props: ProposedScheduleProps): ProposedSchedule {
    return new ProposedSchedule(props);
  }

  public confirm(slotIndex: number): Result<TimeWindow> {
    if (!this._status.isPending) {
      return Result.fail('返答待ちの日程調整だけ確定できます。');
    }
    const slot = this._slots[slotIndex];
    if (!slot) {
      return Result.fail('選択した候補日が見つかりません。');
    }
    this._status = ProposedScheduleStatus.confirmed();
    this._confirmedSlotIndex = slotIndex;
    this._updatedAt = new Date();
    return Result.ok(slot);
  }

  public cancel(): Result<void> {
    if (!this._status.isPending) {
      return Result.fail('返答待ちの日程調整だけ取り下げできます。');
    }
    this._status = ProposedScheduleStatus.cancelled();
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public expire(): Result<void> {
    if (!this._status.isPending) {
      return Result.fail('返答待ちの日程調整だけ期限切れにできます。');
    }
    this._status = ProposedScheduleStatus.expired();
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public occupiesCalendar(): boolean {
    return this._status.code === ('PENDING' satisfies ProposedScheduleStatusCode);
  }
}
