import React, { useState } from "react";
import { Field } from "formik";
import {
	MenuItem,
	Paper,
	Popper,
	TextField,
	Typography
} from "@material-ui/core";

export const MESSAGE_TEMPLATE_VARIABLES = [
	{ value: "{{nome_contato}}", label: "Nome do contato" },
	{ value: "{{telefone_contato}}", label: "Telefone do contato" },
	{ value: "{{nome_atendente}}", label: "Nome do atendente" },
	{ value: "{{nome_ia}}", label: "Nome da IA" },
	{ value: "{{nome_empresa}}", label: "Nome da empresa" },
	{ value: "{{tipo_atendimento}}", label: "Tipo de atendimento" },
	{ value: "{{fila}}", label: "Fila" },
	{ value: "{{fila_humana}}", label: "Fila humana" },
	{ value: "{{categoria}}", label: "Categoria" },
	{ value: "{{motivo_encerramento}}", label: "Motivo de encerramento" },
	{ value: "{{ultima_mensagem}}", label: "Ultima mensagem" },
	{ value: "{{data_hora}}", label: "Data e hora" }
];

const MessageTemplateField = ({
	label,
	name,
	value,
	onChange,
	formik = false,
	rows = 4,
	helperText,
	error,
	...rest
}) => {
	const [anchorEl, setAnchorEl] = useState(null);
	const [caret, setCaret] = useState(0);

	const shouldOpen = text => {
		const beforeCursor = text.slice(0, caret || text.length);
		return beforeCursor.endsWith("{{");
	};

	const handleTextChange = (event, setFieldValue) => {
		const nextValue = event.target.value;
		const nextCaret = event.target.selectionStart || nextValue.length;
		setCaret(nextCaret);
		setAnchorEl(nextValue.slice(0, nextCaret).endsWith("{{") ? event.currentTarget : null);

		if (formik) {
			setFieldValue(name, nextValue);
		} else {
			onChange({ target: { name, value: nextValue } });
		}
	};

	const insertVariable = (variable, currentValue, setFieldValue) => {
		const text = currentValue || "";
		const insertAt = caret || text.length;
		const before = text.slice(0, insertAt).replace(/\{\{$/, "");
		const after = text.slice(insertAt);
		const nextValue = `${before}${variable}${after}`;

		setAnchorEl(null);
		if (formik) {
			setFieldValue(name, nextValue);
		} else {
			onChange({ target: { name, value: nextValue } });
		}
	};

	const renderField = ({ field = {}, form = {} } = {}) => {
		const currentValue = formik ? field.value : value;
		const setFieldValue = formik ? form.setFieldValue : null;

		return (
			<>
				<TextField
					{...rest}
					fullWidth
					multiline
					rows={rows}
					margin="dense"
					variant="outlined"
					label={label}
					name={name}
					value={currentValue || ""}
					error={error}
					helperText={helperText || "Digite {{ para inserir campos automaticamente na mensagem."}
					onChange={event => handleTextChange(event, setFieldValue)}
					onKeyUp={event => {
						setCaret(event.currentTarget.selectionStart || 0);
						setAnchorEl(shouldOpen(event.currentTarget.value) ? event.currentTarget : null);
					}}
				/>
				<Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 2000 }}>
					<Paper elevation={4} style={{ maxHeight: 260, overflowY: "auto", minWidth: 280 }}>
						<Typography variant="caption" style={{ display: "block", padding: 8 }}>
							Inserir campo
						</Typography>
						{MESSAGE_TEMPLATE_VARIABLES.map(item => (
							<MenuItem
								key={item.value}
								dense
								onMouseDown={event => {
									event.preventDefault();
									insertVariable(item.value, currentValue, setFieldValue);
								}}
							>
								{item.label} <Typography variant="caption" style={{ marginLeft: 8 }}>{item.value}</Typography>
							</MenuItem>
						))}
					</Paper>
				</Popper>
			</>
		);
	};

	if (formik) {
		return <Field name={name}>{renderField}</Field>;
	}

	return renderField();
};

export default MessageTemplateField;
