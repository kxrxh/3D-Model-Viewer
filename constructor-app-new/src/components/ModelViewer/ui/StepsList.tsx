import {
	IoLayersOutline,
	IoSaveOutline,
	IoTrashOutline,
	IoCreateOutline,
	IoAddOutline,
	IoRemoveOutline,
	IoChevronDownOutline,
	IoChevronUpOutline,
} from "react-icons/io5";
import { useState, useCallback } from "react";

// Add toast notification type
type ToastType = "info" | "success" | "error" | "warning";

export interface InstructionStep {
	id: number;
	name: string;
	parts: string[];
	description?: string;
}

// Часть и группа (используется только для отображения)
interface PartGroup {
	name: string;
	isGroup: true;
	parts: (PartGroup | PartDetail)[];
	expanded?: boolean;
}

interface PartDetail {
	originalName: string;
	displayName: string;
	isGroup?: false;
}

interface StepsListProps {
	steps: InstructionStep[];
	onEditStep: (index: number) => void;
	onDeleteStep: (index: number) => void;
	onClearAllSteps: () => void;
	onExportSteps: () => void;
	showToast?: (message: string, type: ToastType) => void;
}

const StepsList: React.FC<StepsListProps> = ({
	steps,
	onEditStep,
	onDeleteStep,
	onClearAllSteps,
	onExportSteps,
	showToast,
}) => {
	// State для отслеживания развернутых карточек
	const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>(
		{},
	);
	// State для отслеживания развернутых групп в деталях
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
		{},
	);

	const clearAllSteps = () => {
		if (confirm("Вы уверены, что хотите удалить все шаги?")) {
			onClearAllSteps();
			showToast?.("Все шаги удалены", "info");
		}
	};

	// Функция для переключения состояния развернутости шага
	const toggleStepExpansion = (stepId: number) => {
		setExpandedSteps((prev) => ({
			...prev,
			[stepId]: !prev[stepId],
		}));
	};

	// Функция для переключения состояния развернутости группы
	const toggleGroupExpansion = useCallback((path: string) => {
		setExpandedGroups((prev) => {
			// Если значения в словаре еще нет, считаем группу развернутой (true)
			// Первый клик всегда должен свернуть группу
			const currentValue = path in prev ? prev[path] : true;
			return {
				...prev,
				[path]: !currentValue,
			};
		});
	}, []);

	// Функция для группировки частей по иерархии (аналогично как в AssemblyStepBuilder)
	const groupPartsByHierarchy = useCallback(
		(parts: string[]): PartGroup => {
			const root: PartGroup = {
				name: "root",
				isGroup: true,
				parts: [],
				expanded: true,
			};

			// Отслеживаем пути, которые также являются группами
			const groupPaths = new Set<string>();

			// Первый проход: идентифицируем все группы
			for (const partName of parts) {
				const segments = partName.split("/").map((s) => s.trim());
				if (segments.length > 1) {
					// Если это путь с несколькими сегментами, записываем все родительские пути
					for (let i = 1; i < segments.length; i++) {
						groupPaths.add(segments.slice(0, i).join("/"));
					}
				}
			}

			// Второй проход: создаем фактическую иерархию
			for (const partName of parts) {
				const segments = partName.split("/").map((s) => s.trim());
				let currentLevel = root;

				// Пропускаем эту часть, если она уже представлена как группа
				if (segments.length === 1 && groupPaths.has(partName)) {
					continue;
				}

				// Обрабатываем все сегменты пути, кроме последнего (который является фактической частью)
				for (let i = 0; i < segments.length - 1; i++) {
					const groupName = segments[i];
					// Проверяем, существует ли уже эта группа на текущем уровне
					let group = currentLevel.parts.find(
						(p) => "isGroup" in p && p.isGroup && p.name === groupName,
					) as PartGroup | undefined;

					// Если нет, создаем ее
					if (!group) {
						group = {
							name: groupName,
							isGroup: true,
							parts: [],
							expanded:
								expandedGroups[segments.slice(0, i + 1).join("/")] ?? true,
						};
						currentLevel.parts.push(group);
					}

					currentLevel = group;
				}

				// Сохраняем оригинальное имя части вместе с отображаемым именем (последний сегмент)
				const lastSegment = segments[segments.length - 1];
				currentLevel.parts.push({
					originalName: partName,
					displayName: lastSegment,
					isGroup: false,
				});
			}

			return root;
		},
		[expandedGroups],
	);

	// Компонент для рекурсивного рендеринга групп деталей
	const RenderPartGroup = useCallback(
		({
			group,
			path = "",
			level = 0,
		}: {
			group: PartGroup;
			path?: string;
			level?: number;
		}) => {
			const currentPath = path ? `${path}/${group.name}` : group.name;
			// Если записи для этого пути нет, считаем группу развернутой по умолчанию
			const isExpanded =
				currentPath in expandedGroups ? expandedGroups[currentPath] : true;

			return (
				<div>
					{group.name !== "root" && (
						<button
							type="button"
							className="flex items-center gap-2 text-sm py-1 pl-2 cursor-pointer hover:bg-gray-100 rounded w-full text-left"
							onClick={() => toggleGroupExpansion(currentPath)}
						>
							<span className="text-gray-500 flex-shrink-0">
								{isExpanded ? (
									<IoRemoveOutline size={16} aria-label="Свернуть" />
								) : (
									<IoAddOutline size={16} aria-label="Развернуть" />
								)}
							</span>
							<span
								className="font-medium text-xs truncate flex-1"
								title={group.name}
							>
								{group.name}
							</span>
						</button>
					)}

					{isExpanded && (
						<div
							className={`space-y-0.5 ${level > 0 ? "ml-3 border-l border-gray-200 pl-2" : ""}`}
						>
							{group.parts.map((part, idx) => {
								// Проверяем, является ли это группой
								if ("isGroup" in part && part.isGroup) {
									// Это группа, рендерим ее рекурсивно
									return (
										<RenderPartGroup
											key={`group-${currentPath}-${part.name}-${idx}`}
											group={part}
											path={currentPath}
											level={level + 1}
										/>
									);
								}

								// Это деталь
								const partDetail = part as PartDetail;
								const displayName = partDetail.displayName;

								return (
									<div
										key={`part-${partDetail.originalName}-${idx}`}
										className="text-xs text-gray-600 py-1 pl-2 ml-3"
										title={partDetail.originalName}
									>
										{displayName}
									</div>
								);
							})}
						</div>
					)}
				</div>
			);
		},
		[expandedGroups, toggleGroupExpansion],
	);

	return (
		<div className="p-1">
			<div className="mb-4">
				<div className="flex justify-between items-center mb-3">
					<h4 className="text-sm font-medium text-gray-600 flex items-center">
						<IoLayersOutline className="mr-1.5" size={16} /> Созданные шаги:{" "}
						{steps.length}
					</h4>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onExportSteps}
							disabled={steps.length === 0}
							className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-sm ${
								steps.length === 0
									? "bg-gray-100 text-gray-400 cursor-not-allowed"
									: "bg-green-100 hover:bg-green-200 text-green-700"
							}`}
						>
							<IoSaveOutline size={18} />
							Экспорт
						</button>

						<button
							type="button"
							onClick={clearAllSteps}
							disabled={steps.length === 0}
							className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-sm ${
								steps.length === 0
									? "bg-gray-100 text-gray-400 cursor-not-allowed"
									: "bg-red-100 hover:bg-red-200 text-red-700"
							}`}
						>
							<IoTrashOutline size={18} />
							Очистить
						</button>
					</div>
				</div>

				{steps.length > 0 ? (
					<div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 pb-1">
						{steps.map((step, index) => {
							const isExpanded = expandedSteps[step.id] || false;

							return (
								<div
									key={`step-${step.id}`}
									className="border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 overflow-hidden"
								>
									<div className="flex items-center gap-2 p-3">
										<button
											type="button"
											onClick={() => toggleStepExpansion(step.id)}
											className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
											title={isExpanded ? "Свернуть шаг" : "Развернуть шаг"}
										>
											{isExpanded ? (
												<IoChevronUpOutline size={16} />
											) : (
												<IoChevronDownOutline size={16} />
											)}
										</button>

										<div className="flex-1">
											<div className="flex items-center gap-2">
												<span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
													Шаг {index + 1}
												</span>
												<h4 className="font-medium">{step.name}</h4>
											</div>
											{step.description && (
												<p className="text-sm text-gray-600 mt-1">
													{step.description}
												</p>
											)}
											<div className="text-xs text-gray-500 mt-1">
												{step.parts.length}{" "}
												{step.parts.length === 1 ? "деталь" : "деталей"}
											</div>
										</div>
										<div className="flex gap-1">
											<button
												type="button"
												onClick={() => onEditStep(index)}
												className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"
												title="Редактировать шаг"
											>
												<IoCreateOutline size={18} />
											</button>
											<button
												type="button"
												onClick={() => onDeleteStep(index)}
												className="p-2 text-red-600 hover:bg-red-100 rounded-md"
												title="Удалить шаг"
											>
												<IoTrashOutline size={18} />
											</button>
										</div>
									</div>

									{isExpanded && (
										<div className="p-3 pt-0 border-t border-gray-200 mt-2 bg-white">
											<div className="text-xs font-medium text-gray-700 mb-1.5">
												Детали шага:
											</div>
											<div className="max-h-60 overflow-y-auto">
												<RenderPartGroup
													group={groupPartsByHierarchy(step.parts)}
												/>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
						Пока не создано ни одного шага. Создайте первый шаг, настроив
						видимость деталей и заполнив форму выше.
					</div>
				)}
			</div>
		</div>
	);
};

export default StepsList;
