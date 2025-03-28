/**
 * Determines if a color is light based on YIQ formula
 * @param color Hex color code (e.g. '#ff0000')
 * @returns true if the color is light, false if dark
 */
export function isLightColor(color: string): boolean {
	// Преобразование цвета в формат RGB
	let r = 0;
	let g = 0;
	let b = 0;

	if (color.startsWith("#")) {
		const hex = color.substring(1);
		r = Number.parseInt(hex.substring(0, 2), 16);
		g = Number.parseInt(hex.substring(2, 4), 16);
		b = Number.parseInt(hex.substring(4, 6), 16);
	} else {
		return true; // По умолчанию возвращаем true для неизвестного формата
	}

	// Вычисление яркости по формуле YIQ
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;

	// Если YIQ > 128, то цвет считается светлым
	return yiq > 128;
}
