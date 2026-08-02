<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { DateFormatter, parseDate, today, type CalendarDate } from '@internationalized/date';
	import { IconCalendarEvent, IconChevronDown } from '@tabler/icons-svelte';

	let {
		id,
		name,
		value = $bindable(''),
		placeholder,
		defaultTime,
		accessibleLabel,
		describedBy,
		invalid,
		required = false,
		optional = false,
		disabled = false
	}: {
		id: string;
		name: string;
		value?: string;
		placeholder: string;
		defaultTime: string;
		accessibleLabel: string;
		describedBy?: string;
		invalid?: boolean | 'true' | 'false';
		required?: boolean;
		optional?: boolean;
		disabled?: boolean;
	} = $props();

	const formatter = new DateFormatter('en-KE', { dateStyle: 'medium' });

	let open = $state(false);

	function datePart(dateTime: string) {
		return dateTime.includes('T') ? dateTime.slice(0, 10) : '';
	}

	function timePart(dateTime: string) {
		return dateTime.includes('T') ? dateTime.slice(11, 16) : '';
	}

	function parseCalendarDate(dateTime: string) {
		const date = datePart(dateTime);
		if (!date) return undefined;
		try {
			return parseDate(date);
		} catch {
			return undefined;
		}
	}

	const selectedDate = $derived(parseCalendarDate(value));
	const selectedTime = $derived(timePart(value));

	function selectDate(date: CalendarDate | undefined) {
		if (!date) {
			if (optional) value = '';
			return;
		}
		value = `${date.toString()}T${selectedTime || defaultTime}`;
		open = false;
	}

	function selectTime(time: string) {
		if (!selectedDate) return;
		if (!time) {
			value = optional ? '' : `${selectedDate.toString()}T${defaultTime}`;
			return;
		}
		value = `${selectedDate.toString()}T${time}`;
	}

	function clear() {
		value = '';
		open = false;
	}
</script>

<input type="hidden" {name} {value} />

<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
	<Popover.Root bind:open>
		<Popover.Trigger {id}>
			{#snippet child({ props })}
				<Button
					{...props}
					type="button"
					variant="outline"
					class="w-full justify-start font-normal"
					aria-describedby={describedBy}
					aria-invalid={invalid}
					aria-required={required}
					{disabled}
				>
					<IconCalendarEvent />
					<span class="min-w-0 flex-1 truncate text-start">
						{selectedDate ? formatter.format(selectedDate.toDate('Africa/Nairobi')) : placeholder}
					</span>
					<IconChevronDown class="ms-auto" />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-auto overflow-hidden p-0" align="start">
			<Calendar
				type="single"
				bind:value={() => selectedDate, selectDate}
				captionLayout="dropdown"
				minValue={today('Africa/Nairobi')}
				weekStartsOn={1}
				locale="en-KE"
			/>
		</Popover.Content>
	</Popover.Root>

	<Input
		type="time"
		value={selectedTime}
		onchange={(event) => selectTime(event.currentTarget.value)}
		aria-label={`${accessibleLabel} time in EAT`}
		aria-describedby={describedBy}
		aria-invalid={invalid}
		aria-required={required}
		{required}
		disabled={disabled || !selectedDate}
		class="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
	/>
</div>

{#if optional && value}
	<Button type="button" variant="ghost" size="sm" class="mt-1 px-0" onclick={clear} {disabled}>
		Clear {accessibleLabel.toLowerCase()}
	</Button>
{/if}
