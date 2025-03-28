import React from "react";
import { SearchInput as CommonSearchInput } from "../../common";

/**
 * SearchInput specialized for part selection
 */
function SearchInput(props) {
	return (
		<CommonSearchInput
			{...props}
			placeholder={props.placeholder || "Поиск частей..."}
		/>
	);
}

export default SearchInput;
