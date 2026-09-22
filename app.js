/* =========================================================
   CONTROL FINANCIERO - V5
   ========================================================= */


/* =========================================================
   1. VARIABLES PRINCIPALES
   ========================================================= */

let fechaSeleccionada = new Date();
fechaSeleccionada.setDate(1);

let movimientoEnEdicion = null;


/*
    DATOS FINANCIEROS

    Cada mes tendrá:

    {
        ingresos: [],
        gastos: [],
        compromisos: []
    }
*/

let datosFinancieros =
    JSON.parse(
        localStorage.getItem("datosFinancieros")
    ) || {};


/*
    Plantilla general de gastos fijos.

    Esta lista define qué compromisos deben
    copiarse hacia los meses nuevos.
*/

let gastosFijos =
    JSON.parse(
        localStorage.getItem("gastosFijos")
    ) || [];


let configuracionTarjeta =
    JSON.parse(
        localStorage.getItem("configuracionTarjeta")
    ) || {
        cupo: 0,
        diaFacturacion: 0,
        diaVencimiento: 0
    };

function guardarConfiguracionTarjeta() {
    localStorage.setItem(
        "configuracionTarjeta",
        JSON.stringify(configuracionTarjeta)
    );
}


const CATEGORIAS_V9 = [
    "Alimentación", "Transporte", "Delivery", "Hogar", "Ocio",
    "Compras", "Deudas", "Suscripciones", "Salud", "Otros"
];

let configuracionControl =
    JSON.parse(localStorage.getItem("configuracionControl")) || {
        umbralHormiga: 10000,
        presupuestos: {}
    };

let metasAhorroV9 =
    JSON.parse(localStorage.getItem("metasAhorroV9")) || [];

let metaAhorroV9EnEdicion = null;

function guardarConfiguracionControl() {
    localStorage.setItem(
        "configuracionControl",
        JSON.stringify(configuracionControl)
    );
}

function guardarMetasAhorroV9() {
    localStorage.setItem(
        "metasAhorroV9",
        JSON.stringify(metasAhorroV9)
    );
}

function asegurarAportesAhorro(datos) {
    if (!Array.isArray(datos.aportesAhorro)) {
        datos.aportesAhorro = [];
    }
}

function totalAportesAhorroMes(datos) {
    asegurarAportesAhorro(datos);
    return datos.aportesAhorro.reduce(
        (suma, aporte) => suma + Number(aporte.monto || 0),
        0
    );
}



/* =========================================================
   2. FUNCIONES GENERALES
   ========================================================= */

function obtenerClaveMes() {

    const año =
        fechaSeleccionada.getFullYear();

    const mes =
        String(
            fechaSeleccionada.getMonth() + 1
        ).padStart(2, "0");

    return `${año}-${mes}`;
}


function guardarDatos() {

    localStorage.setItem(
        "datosFinancieros",
        JSON.stringify(datosFinancieros)
    );
}


function guardarFijos() {

    localStorage.setItem(
        "gastosFijos",
        JSON.stringify(gastosFijos)
    );
}


function formatoDinero(numero) {

    return Number(numero).toLocaleString(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        }
    );
}


function generarId() {

    return (
        Date.now()
        +
        Math.floor(
            Math.random() * 10000
        )
    );
}


function formatearFecha(fecha) {

    if (!fecha) {
        return "";
    }

    return new Date(fecha)
        .toLocaleDateString(
            "es-CL",
            {
                day: "2-digit",
                month: "short"
            }
        );
}


/* =========================================================
   3. SNAPSHOT DE COMPROMISOS
   ========================================================= */

/*
    Esta es una de las mejoras más importantes.

    Cuando entramos por primera vez a un mes,
    copiamos los gastos fijos existentes.

    Después esa copia pertenece exclusivamente
    a ese mes.

    Por lo tanto:

    si en noviembre eliminamos "Cuota auto",
    septiembre NO cambiará.
*/

function crearSnapshotCompromisos() {

    return gastosFijos
        .filter(
            fijo =>
                fijo.activo !== false
        )
        .map(
            fijo => ({

                id: generarId(),

                plantillaId: fijo.id,

                nombre: fijo.nombre,

                monto: fijo.monto,

                categoria: fijo.categoria,

                dia: fijo.dia,

                pagado: false,

                fechaPago: null,

                gastoGeneradoId: null

            })
        );
}


/* =========================================================
   4. OBTENER DATOS DEL MES
   ========================================================= */

function obtenerDatosMes() {

    const clave =
        obtenerClaveMes();


    if (!datosFinancieros[clave]) {

        datosFinancieros[clave] = {

            ingresos: [],

            gastos: [],

            compromisos:
                crearSnapshotCompromisos()

        };


        guardarDatos();
    }


    const datos =
        datosFinancieros[clave];


    /*
        Compatibilidad con V4.
    */

    if (!datos.ingresos) {
        datos.ingresos = [];
    }

    if (!datos.gastos) {
        datos.gastos = [];
    }
    if (
    datos.metaAhorro === undefined
) {

    datos.metaAhorro = 0;

}


    /*
        MIGRACIÓN V4 → V5

        En V4 utilizábamos fijosPagados.

        Si el mes todavía no tiene
        "compromisos", convertimos la estructura
        anterior automáticamente.
    */

    if (!datos.compromisos) {

        const antiguosPagados =
            datos.fijosPagados || [];


        datos.compromisos =
            gastosFijos.map(
                fijo => {

                    const pagado =
                        antiguosPagados
                            .includes(
                                fijo.id
                            );


                    const gastoRelacionado =
                        datos.gastos.find(
                            gasto =>
                                gasto.esFijo
                                &&
                                gasto.fijoId
                                === fijo.id
                        );


                    return {

                        id: generarId(),

                        plantillaId: fijo.id,

                        nombre: fijo.nombre,

                        monto: fijo.monto,

                        categoria:
                            fijo.categoria,

                        dia: fijo.dia,

                        pagado: pagado,

                        fechaPago:
                            gastoRelacionado
                                ? gastoRelacionado.fecha
                                : null,

                        gastoGeneradoId:
                            gastoRelacionado
                                ? gastoRelacionado.id
                                : null

                    };

                }
            );


        delete datos.fijosPagados;


        guardarDatos();
    }


    return datos;
}


/* =========================================================
   5. NOMBRE DEL MES
   ========================================================= */

function actualizarNombreMes() {

    const nombre =
        fechaSeleccionada
            .toLocaleDateString(
                "es-CL",
                {
                    month: "long",
                    year: "numeric"
                }
            );


    document.getElementById(
        "mesActual"
    ).textContent =
        nombre.charAt(0)
        .toUpperCase()
        +
        nombre.slice(1);
}


/* =========================================================
   6. NAVEGACIÓN MENSUAL
   ========================================================= */

document.getElementById(
    "mesAnterior"
).addEventListener(
    "click",
    function () {

        fechaSeleccionada.setMonth(
            fechaSeleccionada.getMonth() - 1
        );

        actualizarDashboard();
    }
);


document.getElementById(
    "mesSiguiente"
).addEventListener(
    "click",
    function () {

        fechaSeleccionada.setMonth(
            fechaSeleccionada.getMonth() + 1
        );

        actualizarDashboard();
    }
);


/* =========================================================
   7. MODALES
   ========================================================= */

const modalMovimiento =
    document.getElementById(
        "modalMovimiento"
    );

const modalGasto =
    document.getElementById(
        "modalGasto"
    );

const modalIngreso =
    document.getElementById(
        "modalIngreso"
    );

const modalConfiguracion =
    document.getElementById(
        "modalConfiguracion"
    );

const modalFijo =
    document.getElementById(
        "modalFijo"
    );

const modalEditar =
    document.getElementById(
        "modalEditar"
    );

const modalMetaAhorro =
    document.getElementById(
        "modalMetaAhorro"
    );


const modalPresupuestos =
    document.getElementById("modalPresupuestos");

const modalMetaAhorroV9 =
    document.getElementById("modalMetaAhorroV9");



function abrirModal(modal) {

    modal.classList.add("activo");
}


function cerrarModal(modal) {

    modal.classList.remove("activo");
}


/* =========================================================
   8. BOTÓN +
   ========================================================= */

document.getElementById(
    "btnMovimiento"
).addEventListener(
    "click",
    function () {

        abrirModal(
            modalMovimiento
        );
    }
);


document.getElementById(
    "cerrarMovimiento"
).addEventListener(
    "click",
    () =>
        cerrarModal(
            modalMovimiento
        )
);


document.getElementById(
    "opcionGasto"
).addEventListener(
    "click",
    function () {

        cerrarModal(
            modalMovimiento
        );

        abrirModal(
            modalGasto
        );
    }
);


document.getElementById(
    "opcionIngreso"
).addEventListener(
    "click",
    function () {

        cerrarModal(
            modalMovimiento
        );

        abrirModal(
            modalIngreso
        );
    }
);


/* =========================================================
   9. CERRAR MODALES
   ========================================================= */

document.getElementById(
    "cerrarGasto"
).addEventListener(
    "click",
    () =>
        cerrarModal(
            modalGasto
        )
);


document.getElementById(
    "cerrarIngreso"
).addEventListener(
    "click",
    () =>
        cerrarModal(
            modalIngreso
        )
);


document.getElementById(
    "cerrarConfiguracion"
).addEventListener(
    "click",
    () =>
        cerrarModal(
            modalConfiguracion
        )
);


document.getElementById(
    "cerrarFijo"
).addEventListener(
    "click",
    () =>
        cerrarModal(
            modalFijo
        )
);


document.getElementById(
    "cerrarEditar"
).addEventListener(
    "click",
    function () {

        movimientoEnEdicion = null;

        cerrarModal(
            modalEditar
        );
    }
);


/* =========================================================
   10. CONFIGURACIÓN
   ========================================================= */

document.getElementById(
    "btnConfiguracion"
).addEventListener(
    "click",
    function () {

        const datos =
            obtenerDatosMes();


        const sueldo =
            datos.ingresos.find(
                ingreso =>
                    ingreso.tipo === "Sueldo"
            );


        document.getElementById(
            "inputSueldo"
        ).value =
            sueldo
                ? sueldo.monto
                : "";


        mostrarGastosFijos();

        document.getElementById("inputCupoTarjeta").value =
            configuracionTarjeta.cupo || "";

        document.getElementById("inputDiaFacturacion").value =
            configuracionTarjeta.diaFacturacion || "";

        document.getElementById("inputDiaVencimientoTarjeta").value =
            configuracionTarjeta.diaVencimiento || "";

        document.getElementById("inputUmbralHormiga").value =
            configuracionControl.umbralHormiga ?? 10000;


        abrirModal(
            modalConfiguracion
        );
    }
);


/* =========================================================
   11. SUELDO
   ========================================================= */

document.getElementById(
    "btnGuardarSueldo"
).addEventListener(
    "click",
    function () {

        const monto =
            Number(
                document.getElementById(
                    "inputSueldo"
                ).value
            );


        if (monto <= 0) {

            alert(
                "Ingresa un sueldo válido."
            );

            return;
        }


        const datos =
            obtenerDatosMes();


        const sueldoExistente =
            datos.ingresos.find(
                ingreso =>
                    ingreso.tipo === "Sueldo"
            );


        if (sueldoExistente) {

            sueldoExistente.monto =
                monto;

            sueldoExistente.descripcion =
                "Sueldo mensual";

        } else {

            datos.ingresos.push({

                id: generarId(),

                tipo: "Sueldo",

                descripcion:
                    "Sueldo mensual",

                monto: monto,

                fecha:
                    new Date()
                        .toISOString()

            });
        }


        guardarDatos();

        actualizarDashboard();

        alert(
            "Sueldo actualizado correctamente."
        );
    }
);


/* =========================================================
   12. INGRESO ADICIONAL
   ========================================================= */

document.getElementById(
    "btnGuardarIngreso"
).addEventListener(
    "click",
    function () {

        const monto =
            Number(
                document.getElementById(
                    "inputIngreso"
                ).value
            );


        const tipo =
            document.getElementById(
                "tipoIngreso"
            ).value;


        const descripcion =
            document.getElementById(
                "descripcionIngreso"
            ).value.trim();


        if (monto <= 0) {

            alert(
                "Ingresa un monto válido."
            );

            return;
        }


        const datos =
            obtenerDatosMes();


        const nuevoIngreso = {

            id: generarId(),

            tipo: tipo,

            descripcion:
                descripcion || tipo,

            monto: monto,

            fecha:
                new Date()
                    .toISOString()

        };

        datos.ingresos.push(nuevoIngreso);

        aplicarAhorroAutomaticoIngresoExtra(
            datos,
            nuevoIngreso
        );


        guardarDatos();


        document.getElementById(
            "inputIngreso"
        ).value = "";


        document.getElementById(
            "descripcionIngreso"
        ).value = "";


        cerrarModal(
            modalIngreso
        );


        actualizarDashboard();
    }
);


/* =========================================================
   13. REGISTRAR GASTO
   ========================================================= */

document.getElementById(
    "btnGuardarGasto"
).addEventListener(
    "click",
    function () {

        const monto =
            Number(
                document.getElementById(
                    "inputGasto"
                ).value
            );


        const categoria =
            document.getElementById(
                "categoriaGasto"
            ).value;


        const descripcion =
            document.getElementById(
                "descripcionGasto"
            ).value.trim();


        const esHormiga =
            document.getElementById(
                "esHormiga"
            ).checked;


        const medioPago =
            document.getElementById(
                "medioPagoGasto"
            ).value;


        if (monto <= 0) {

            alert(
                "Ingresa un monto válido."
            );

            return;
        }


        const datos =
            obtenerDatosMes();


        datos.gastos.push({

            id: generarId(),

            monto: monto,

            categoria: categoria,

            descripcion:
                descripcion
                ||
                categoria,

            medioPago: medioPago,

            esHormiga: esHormiga,

            esFijo: false,

            fecha:
                new Date()
                    .toISOString()

        });


        guardarDatos();


        document.getElementById(
            "inputGasto"
        ).value = "";


        document.getElementById(
            "descripcionGasto"
        ).value = "";


        document.getElementById(
            "esHormiga"
        ).checked = false;


        document.getElementById(
            "medioPagoGasto"
        ).value = "Debito/Efectivo";


        cerrarModal(
            modalGasto
        );


        actualizarDashboard();
    }
);



/* =========================================================
   V9 - DETECCIÓN AUTOMÁTICA DE GASTO HORMIGA
   ========================================================= */

function aplicarDeteccionHormiga() {
    const inputMonto = document.getElementById("inputGasto");
    const check = document.getElementById("esHormiga");
    const info = document.getElementById("reglaHormigaInfo");
    if (!inputMonto || !check || !info) return;

    const monto = Number(inputMonto.value || 0);
    const umbral = Number(configuracionControl.umbralHormiga || 0);

    if (monto > 0 && umbral > 0 && monto <= umbral) {
        check.checked = true;
        info.textContent =
            `🤖 Marcado automáticamente: gasto ≤ ${formatoDinero(umbral)}. Puedes desmarcarlo.`;
    } else {
        info.textContent =
            umbral > 0
                ? `🤖 Se marcará automáticamente como hormiga si es ≤ ${formatoDinero(umbral)}.`
                : "Detección automática desactivada.";
    }
}

document.getElementById("inputGasto").addEventListener(
    "input",
    aplicarDeteccionHormiga
);

document.getElementById("btnGuardarUmbralHormiga").addEventListener(
    "click",
    function () {
        const valor = Number(
            document.getElementById("inputUmbralHormiga").value
        );

        if (!Number.isFinite(valor) || valor < 0) {
            alert("Ingresa un monto válido.");
            return;
        }

        configuracionControl.umbralHormiga = valor;
        guardarConfiguracionControl();
        aplicarDeteccionHormiga();
        alert("Regla de gasto hormiga actualizada.");
    }
);


/* =========================================================
   14. NUEVO GASTO FIJO
   ========================================================= */

document.getElementById(
    "btnNuevoFijo"
).addEventListener(
    "click",
    function () {

        cerrarModal(
            modalConfiguracion
        );

        abrirModal(
            modalFijo
        );
    }
);


document.getElementById(
    "btnGuardarFijo"
).addEventListener(
    "click",
    function () {

        const nombre =
            document.getElementById(
                "nombreFijo"
            ).value.trim();


        const monto =
            Number(
                document.getElementById(
                    "montoFijo"
                ).value
            );


        const categoria =
            document.getElementById(
                "categoriaFijo"
            ).value;


        const dia =
            Number(
                document.getElementById(
                    "diaFijo"
                ).value
            );


        if (!nombre) {

            alert(
                "Ingresa el nombre del gasto."
            );

            return;
        }


        if (monto <= 0) {

            alert(
                "Ingresa un monto válido."
            );

            return;
        }


        if (
            dia < 1
            ||
            dia > 31
        ) {

            alert(
                "Ingresa un día entre 1 y 31."
            );

            return;
        }


        gastosFijos.push({

            id: generarId(),

            nombre: nombre,

            monto: monto,

            categoria: categoria,

            dia: dia,

            activo: true

        });


        guardarFijos();


        /*
            IMPORTANTE:

            También lo agregamos al mes
            actualmente seleccionado.

            Así aparece inmediatamente.
        */

        const datos =
            obtenerDatosMes();


        datos.compromisos.push({

            id: generarId(),

            plantillaId:
                gastosFijos[
                    gastosFijos.length - 1
                ].id,

            nombre: nombre,

            monto: monto,

            categoria: categoria,

            dia: dia,

            pagado: false,

            fechaPago: null,

            gastoGeneradoId: null

        });


        guardarDatos();


        document.getElementById(
            "nombreFijo"
        ).value = "";


        document.getElementById(
            "montoFijo"
        ).value = "";


        document.getElementById(
            "diaFijo"
        ).value = "";


        cerrarModal(
            modalFijo
        );


        abrirModal(
            modalConfiguracion
        );


        mostrarGastosFijos();

        actualizarDashboard();
    }
);


/* =========================================================
   15. MOSTRAR GASTOS FIJOS
   ========================================================= */

function mostrarGastosFijos() {

    const lista =
        document.getElementById(
            "listaGastosFijos"
        );


    lista.innerHTML = "";


    if (gastosFijos.length === 0) {

        lista.innerHTML = `

            <p class="sin-datos">
                Aún no tienes gastos fijos.
            </p>

        `;

        return;
    }


    const ordenados =
        [...gastosFijos]
            .sort(
                (a, b) =>
                    a.dia - b.dia
            );


    ordenados.forEach(
        fijo => {

            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "gasto-fijo-item";


            elemento.innerHTML = `

                <div>

                    <strong>
                        ${fijo.nombre}
                    </strong>

                    <span>
                        Día ${fijo.dia}
                        ·
                        ${fijo.categoria}
                    </span>

                </div>

                <div class="fijo-derecha">

                    <strong>
                        ${formatoDinero(
                            fijo.monto
                        )}
                    </strong>

                    <button
                        class="eliminar-fijo"

                        onclick="
                            eliminarGastoFijo(
                                ${fijo.id}
                            )
                        "
                    >

                        Eliminar

                    </button>

                </div>

            `;


            lista.appendChild(
                elemento
            );
        }
    );
}


/* =========================================================
   16. ELIMINAR PLANTILLA DE GASTO FIJO
   ========================================================= */

function eliminarGastoFijo(id) {

    const fijo =
        gastosFijos.find(
            item => item.id === id
        );

    if (!fijo) return;


    const confirmar =
        confirm(
            `¿Eliminar "${fijo.nombre}" de tus gastos fijos?`
        );

    if (!confirmar) return;


    /* ==============================
       1. ELIMINAR DE CONFIGURACIÓN
       ============================== */

    gastosFijos =
        gastosFijos.filter(
            item => item.id !== id
        );

    guardarFijos();


    /* ==============================
       2. ELIMINAR COMPROMISOS
          PENDIENTES DE LOS MESES
       ============================== */

    Object.values(
        datosFinancieros
    ).forEach(
        datos => {

            if (
                !Array.isArray(
                    datos.compromisos
                )
            ) {
                return;
            }


            datos.compromisos =
                datos.compromisos.filter(
                    compromiso => {

                        /*
                           Si pertenece al gasto
                           eliminado Y todavía
                           no fue pagado,
                           lo eliminamos.
                        */

                        if (
                            compromiso.plantillaId === id
                            &&
                            !compromiso.pagado
                        ) {

                            return false;

                        }


                        /*
                           Si ya fue pagado,
                           conservamos el historial.
                        */

                        return true;

                    }
                );

        }
    );


    guardarDatos();


    /* ==============================
       3. ACTUALIZAR PANTALLA
       ============================== */

    mostrarGastosFijos();

    actualizarDashboard();

}


/* =========================================================
   17. PAGAR COMPROMISO
   ========================================================= */

function pagarCompromiso(id) {

    const datos =
        obtenerDatosMes();


    const compromiso =
        datos.compromisos.find(
            item =>
                item.id === id
        );


    if (!compromiso) {
        return;
    }


    if (compromiso.pagado) {

        return;
    }


    const idGasto =
        generarId();


    compromiso.pagado = true;

    compromiso.fechaPago =
        new Date().toISOString();

    compromiso.gastoGeneradoId =
        idGasto;


    /*
        Al pagar el compromiso,
        pasa a ser un gasto realizado.
    */

    datos.gastos.push({

        id: idGasto,

        monto:
            compromiso.monto,

        categoria:
            compromiso.categoria,

        descripcion:
            compromiso.nombre,

        esHormiga: false,

        esFijo: true,

        compromisoId:
            compromiso.id,

        fecha:
            compromiso.fechaPago

    });


    guardarDatos();

    actualizarDashboard();
}


/* =========================================================
   18. DESHACER PAGO
   ========================================================= */

function deshacerPagoCompromiso(id) {

    const datos =
        obtenerDatosMes();


    const compromiso =
        datos.compromisos.find(
            item =>
                item.id === id
        );


    if (
        !compromiso
        ||
        !compromiso.pagado
    ) {

        return;
    }


    const confirmar =
        confirm(
            `¿Marcar "${compromiso.nombre}" nuevamente como pendiente?`
        );


    if (!confirmar) {
        return;
    }


    /*
        Eliminamos el gasto que se generó
        automáticamente al pagarlo.
    */

    if (
        compromiso.gastoGeneradoId
    ) {

        datos.gastos =
            datos.gastos.filter(
                gasto =>
                    gasto.id !==
                    compromiso
                        .gastoGeneradoId
            );
    }


    compromiso.pagado = false;

    compromiso.fechaPago = null;

    compromiso.gastoGeneradoId = null;


    guardarDatos();

    actualizarDashboard();
}


/* =========================================================
   19. ICONOS
   ========================================================= */

function obtenerIcono(categoria) {

    const iconos = {

        "Alimentación": "🍔",
        "Transporte": "🚗",
        "Delivery": "🛵",
        "Hogar": "🏠",
        "Ocio": "🎮",
        "Compras": "🛍️",
        "Deudas": "💳",
        "Suscripciones": "📱",
        "Salud": "🏥",
        "Otros": "📦"

    };


    return (
        iconos[categoria]
        ||
        "💸"
    );
}


/* =========================================================
   20. RESUMEN COMPROMISOS
   ========================================================= */

function actualizarCompromisos(
    datos
) {

    const total =
        datos.compromisos.reduce(
            (suma, compromiso) =>
                suma
                +
                compromiso.monto,
            0
        );


    const pagados =
        datos.compromisos
            .filter(
                compromiso =>
                    compromiso.pagado
            )
            .reduce(
                (suma, compromiso) =>
                    suma
                    +
                    compromiso.monto,
                0
            );


    const pendientes =
        total - pagados;


    document.getElementById(
        "totalCompromisos"
    ).textContent =
        formatoDinero(total);


    document.getElementById(
        "fijosPagados"
    ).textContent =
        formatoDinero(pagados);


    document.getElementById(
        "fijosPendientes"
    ).textContent =
        formatoDinero(pendientes);
}


/* =========================================================
   21. MOSTRAR COMPROMISOS
   ========================================================= */

function mostrarCompromisos(
    datos
) {

    const contenedor =
        document.getElementById(
            "listaCompromisos"
        );


    contenedor.innerHTML = "";


    if (
        datos.compromisos.length === 0
    ) {

        contenedor.innerHTML = `

            <p class="sin-datos">
                No tienes compromisos
                configurados para este mes.
            </p>

        `;

        return;
    }


    const ordenados =
        [...datos.compromisos]
            .sort(
                (a, b) =>
                    a.dia - b.dia
            );


    ordenados.forEach(
        compromiso => {

            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                compromiso.pagado
                    ? "compromiso-item pagado"
                    : "compromiso-item";


            elemento.innerHTML = `

                <div class="compromiso-superior">

                    <div class="compromiso-info">

                        <div class="compromiso-icono">

                            ${obtenerIcono(
                                compromiso.categoria
                            )}

                        </div>

                        <div>

                            <strong>
                                ${compromiso.nombre}
                            </strong>

                            <span>

                                Vence día
                                ${compromiso.dia}

                                ·

                                ${compromiso.categoria}

                            </span>

                        </div>

                    </div>

                    <div class="compromiso-monto">

                        ${formatoDinero(
                            compromiso.monto
                        )}

                    </div>

                </div>


                <span
                    class="
                        estado-pago

                        ${
                            compromiso.pagado
                                ? "estado-pagado"
                                : "estado-pendiente"
                        }
                    "
                >

                    ${
                        compromiso.pagado
                            ? "✓ PAGADO"
                            : "PENDIENTE"
                    }

                </span>


                ${
                    compromiso.pagado

                    ?

                    `

                    <button
                        class="btn-deshacer-pago"

                        onclick="
                            deshacerPagoCompromiso(
                                ${compromiso.id}
                            )
                        "
                    >

                        ↶ Deshacer pago

                    </button>

                    `

                    :

                    `

                    <button
                        class="btn-pagar-fijo"

                        onclick="
                            pagarCompromiso(
                                ${compromiso.id}
                            )
                        "
                    >

                        ✓ Marcar como pagado

                    </button>

                    `
                }

            `;


            contenedor.appendChild(
                elemento
            );
        }
    );
}


/* =========================================================
   22. GASTOS HORMIGA
   ========================================================= */

function actualizarHormiga(
    datos
) {

    const hormiga =
        datos.gastos.filter(
            gasto =>
                gasto.esHormiga
        );


    const total =
        hormiga.reduce(
            (suma, gasto) =>
                suma + gasto.monto,
            0
        );


    const cantidad =
        hormiga.length;


    document.getElementById(
        "totalHormiga"
    ).textContent =
        formatoDinero(total);


    document.getElementById(
        "cantidadHormiga"
    ).textContent =
        `${cantidad} ${
            cantidad === 1
                ? "movimiento"
                : "movimientos"
        } este mes`;
}


/* =========================================================
   23. CATEGORÍAS
   ========================================================= */

function mostrarCategorias(
    datos
) {

    const contenedor =
        document.getElementById(
            "resumenCategorias"
        );


    contenedor.innerHTML = "";


    if (
        datos.gastos.length === 0
    ) {

        contenedor.innerHTML = `

            <p class="sin-datos">
                Todavía no existen gastos este mes.
            </p>

        `;

        return;
    }


    const categorias = {};


    datos.gastos.forEach(
        gasto => {

            if (
                !categorias[
                    gasto.categoria
                ]
            ) {

                categorias[
                    gasto.categoria
                ] = 0;
            }


            categorias[
                gasto.categoria
            ] += gasto.monto;
        }
    );


    const total =
        datos.gastos.reduce(
            (suma, gasto) =>
                suma + gasto.monto,
            0
        );


    const ordenadas =
        Object.entries(
            categorias
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        );


    ordenadas.forEach(
        ([categoria, monto]) => {

            const porcentaje =
                total > 0
                    ? monto / total * 100
                    : 0;


            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "categoria-item";


            elemento.innerHTML = `

                <div class="categoria-superior">

                    <span>

                        ${obtenerIcono(
                            categoria
                        )}

                        ${categoria}

                    </span>

                    <strong>

                        ${formatoDinero(
                            monto
                        )}

                    </strong>

                </div>


                <div class="categoria-barra">

                    <div
                        class="categoria-progreso"

                        style="
                            width:
                            ${porcentaje}%;
                        "
                    ></div>

                </div>

            `;


            contenedor.appendChild(
                elemento
            );
        }
    );
}


/* =========================================================
   24. ABRIR EDICIÓN DE MOVIMIENTO
   ========================================================= */

function editarMovimiento(
    tipo,
    id
) {

    const datos =
        obtenerDatosMes();


    let movimiento;


    if (tipo === "gasto") {

        movimiento =
            datos.gastos.find(
                gasto =>
                    gasto.id === id
            );

    } else {

        movimiento =
            datos.ingresos.find(
                ingreso =>
                    ingreso.id === id
            );
    }


    if (!movimiento) {
        return;
    }


    /*
        Los gastos fijos pagados no se editan
        desde movimientos.

        Para corregirlos se utiliza
        "Deshacer pago".
    */

    if (
        tipo === "gasto"
        &&
        movimiento.esFijo
    ) {

        alert(
            "Este movimiento corresponde a un compromiso mensual. Para corregirlo, utiliza “Deshacer pago” en la sección de compromisos."
        );

        return;
    }


    movimientoEnEdicion = {
        tipo: tipo,
        id: id
    };


    document.getElementById(
        "tituloEditar"
    ).textContent =
        tipo === "gasto"
            ? "Editar gasto"
            : "Editar ingreso";


    document.getElementById(
        "editarMonto"
    ).value =
        movimiento.monto;


    document.getElementById(
        "editarDescripcion"
    ).value =
        movimiento.descripcion || "";


    const opcionesGasto =
        document.getElementById(
            "editarOpcionesGasto"
        );


    if (tipo === "gasto") {

        opcionesGasto.style.display =
            "block";


        document.getElementById(
            "editarCategoria"
        ).value =
            movimiento.categoria;


        document.getElementById(
            "editarHormiga"
        ).checked =
            Boolean(
                movimiento.esHormiga
            );

        document.getElementById(
            "editarMedioPago"
        ).value =
            movimiento.medioPago
            || "Debito/Efectivo";

    } else {

        opcionesGasto.style.display =
            "none";
    }


    abrirModal(
        modalEditar
    );
}


/* =========================================================
   25. GUARDAR EDICIÓN
   ========================================================= */

document.getElementById(
    "btnGuardarEdicion"
).addEventListener(
    "click",
    function () {

        if (!movimientoEnEdicion) {
            return;
        }


        const monto =
            Number(
                document.getElementById(
                    "editarMonto"
                ).value
            );


        const descripcion =
            document.getElementById(
                "editarDescripcion"
            ).value.trim();


        if (monto <= 0) {

            alert(
                "Ingresa un monto válido."
            );

            return;
        }


        const datos =
            obtenerDatosMes();


        if (
            movimientoEnEdicion.tipo
            === "gasto"
        ) {

            const gasto =
                datos.gastos.find(
                    item =>
                        item.id ===
                        movimientoEnEdicion.id
                );


            if (!gasto) {
                return;
            }


            gasto.monto =
                monto;

            gasto.descripcion =
                descripcion
                ||
                gasto.categoria;

            gasto.categoria =
                document.getElementById(
                    "editarCategoria"
                ).value;

            gasto.esHormiga =
                document.getElementById(
                    "editarHormiga"
                ).checked;

            gasto.medioPago =
                document.getElementById(
                    "editarMedioPago"
                ).value;

        } else {

            const ingreso =
                datos.ingresos.find(
                    item =>
                        item.id ===
                        movimientoEnEdicion.id
                );


            if (!ingreso) {
                return;
            }


            ingreso.monto =
                monto;

            ingreso.descripcion =
                descripcion
                ||
                ingreso.tipo;
        }


        guardarDatos();


        movimientoEnEdicion = null;


        cerrarModal(
            modalEditar
        );


        actualizarDashboard();
    }
);


/* =========================================================
   26. ELIMINAR MOVIMIENTO
   ========================================================= */

document.getElementById(
    "btnEliminarMovimiento"
).addEventListener(
    "click",
    function () {

        if (!movimientoEnEdicion) {
            return;
        }


        const datos =
            obtenerDatosMes();


        const confirmar =
            confirm(
                "¿Seguro que quieres eliminar este movimiento?"
            );


        if (!confirmar) {
            return;
        }


        if (
            movimientoEnEdicion.tipo
            === "gasto"
        ) {

            datos.gastos =
                datos.gastos.filter(
                    gasto =>
                        gasto.id !==
                        movimientoEnEdicion.id
                );

        } else {

            datos.ingresos =
                datos.ingresos.filter(
                    ingreso =>
                        ingreso.id !==
                        movimientoEnEdicion.id
                );
        }


        guardarDatos();


        movimientoEnEdicion = null;


        cerrarModal(
            modalEditar
        );


        actualizarDashboard();
    }
);


/* =========================================================
   27. MOSTRAR MOVIMIENTOS
   ========================================================= */

function mostrarMovimientos(
    datos
) {

    const lista =
        document.getElementById(
            "listaMovimientos"
        );


    lista.innerHTML = "";


    const movimientos = [];


    datos.gastos.forEach(
        gasto => {

            movimientos.push({

                ...gasto,

                clase: "gasto",

                titulo:
                    gasto.descripcion
                    ||
                    gasto.categoria,

                subtitulo:
                    gasto.categoria
                    +
                    (
                        gasto.medioPago === "Tarjeta de credito"
                            ? " · 💳 Crédito"
                            : ""
                    ),

                icono:
                    obtenerIcono(
                        gasto.categoria
                    )

            });
        }
    );


    datos.ingresos.forEach(
        ingreso => {

            movimientos.push({

                ...ingreso,

                clase: "ingreso",

                titulo:
                    ingreso.descripcion
                    ||
                    ingreso.tipo,

                subtitulo:
                    ingreso.tipo,

                icono:
                    ingreso.tipo === "Sueldo"
                        ? "💼"
                        : "💰"

            });
        }
    );


    movimientos.sort(
        (a, b) =>
            new Date(b.fecha)
            -
            new Date(a.fecha)
    );


    if (
        movimientos.length === 0
    ) {

        lista.innerHTML = `

            <p class="sin-datos">
                No hay movimientos registrados.
            </p>

        `;

        return;
    }


    movimientos
        .slice(0, 20)
        .forEach(
            movimiento => {

                const elemento =
                    document.createElement(
                        "div"
                    );


                elemento.className =
                    "movimiento";


                const signo =
                    movimiento.clase
                    === "ingreso"
                        ? "+"
                        : "-";


                elemento.innerHTML = `

                    <div class="movimiento-izquierda">

                        <div class="movimiento-icono">

                            ${movimiento.icono}

                        </div>

                        <div class="movimiento-info">

                            <strong>

                                ${movimiento.titulo}

                            </strong>

                            <span>

                                ${movimiento.subtitulo}

                                ${
                                    movimiento.esHormiga
                                        ? " · 🐜 Hormiga"
                                        : ""
                                }

                                ${
                                    movimiento.esFijo
                                        ? " · 🔒 Fijo"
                                        : ""
                                }

                            </span>

                            <small class="movimiento-fecha">

                                ${formatearFecha(
                                    movimiento.fecha
                                )}

                            </small>

                        </div>

                    </div>


                    <div
                        class="
                            movimiento-monto
                            ${movimiento.clase}
                        "
                    >

                        ${signo}

                        ${formatoDinero(
                            movimiento.monto
                        )}

                    </div>

                `;


                elemento.addEventListener(
                    "click",
                    function () {

                        editarMovimiento(
                            movimiento.clase,
                            movimiento.id
                        );
                    }
                );


                lista.appendChild(
                    elemento
                );
            }
        );
}
/* =========================================================
   META DE AHORRO
   ========================================================= */

const btnConfigurarMeta =
    document.getElementById("btnConfigurarMeta");

const btnGuardarMetaAhorro =
    document.getElementById("guardarMetaAhorro");

const btnCerrarMetaAhorro =
    document.getElementById("cerrarMetaAhorro");

const inputMetaAhorro =
    document.getElementById("inputMetaAhorro");


btnConfigurarMeta.addEventListener(
    "click",
    function () {

        const datos = obtenerDatosMes();

        inputMetaAhorro.value =
            datos.metaAhorro || "";

        abrirModal(modalMetaAhorro);
    }
);


btnCerrarMetaAhorro.addEventListener(
    "click",
    function () {

        cerrarModal(modalMetaAhorro);

    }
);


btnGuardarMetaAhorro.addEventListener(
    "click",
    function () {

        const monto =
            Number(inputMetaAhorro.value);


        if (
            !Number.isFinite(monto) ||
            monto < 0
        ) {

            alert(
                "Ingresa una meta de ahorro válida."
            );

            return;
        }


        const datos =
            obtenerDatosMes();


        datos.metaAhorro =
            monto;


        guardarDatos();


        cerrarModal(
            modalMetaAhorro
        );


        actualizarDashboard();


        console.log(
            "Meta guardada:",
            datos.metaAhorro
        );

    }
);
/* =========================================================
   ANÁLISIS FINANCIERO
   ========================================================= */

function actualizarAnalisisFinanciero(
    datos,
    totalIngresos,
    totalGastos,
    compromisosPendientes
) {

    const metaAhorro =
        Number(
            datos.metaAhorro || 0
        );


    /*
        DINERO REALMENTE LIBRE

        Primero reservamos:
        - gastos realizados
        - compromisos
        - ahorro
    */

    const disponibleDespuesAhorro =
        totalIngresos
        -
        totalGastos
        -
        compromisosPendientes
        -
        metaAhorro;


    /*
        GASTOS HORMIGA
    */

    const gastosHormiga =
        datos.gastos.filter(
            gasto =>
                gasto.esHormiga
        );


    const totalHormiga =
        gastosHormiga.reduce(
            (suma, gasto) =>
                suma + gasto.monto,
            0
        );


    /*
        PROMEDIO DIARIO

        Solo consideramos gastos variables.

        Los compromisos fijos no deben
        distorsionar el comportamiento diario.
    */

    const gastosVariables =
        datos.gastos.filter(
            gasto =>
                !gasto.esFijo
        );


    const totalVariable =
        gastosVariables.reduce(
            (suma, gasto) =>
                suma + gasto.monto,
            0
        );


    /*
        Determinamos cuántos días utilizar
        para el promedio.

        Si estamos mirando el mes actual,
        usamos el día de hoy.

        Si estamos mirando un mes anterior,
        utilizamos todos los días del mes.
    */

    const hoy =
        new Date();


    const esMesActual =
        hoy.getFullYear()
            ===
        fechaSeleccionada.getFullYear()

        &&

        hoy.getMonth()
            ===
        fechaSeleccionada.getMonth();


    const diasDelMes =
        new Date(
            fechaSeleccionada.getFullYear(),
            fechaSeleccionada.getMonth() + 1,
            0
        ).getDate();


    const diasTranscurridos =
        esMesActual
            ? hoy.getDate()
            : diasDelMes;


    const promedioDiario =
        diasTranscurridos > 0
            ? totalVariable
              /
              diasTranscurridos
            : 0;


    /*
        PROYECCIÓN

        Si mantienes el ritmo actual
        de gastos variables:
    */

    const proyeccionVariable =
        promedioDiario
        *
        diasDelMes;


    /*
        Compromisos totales del mes.
    */

    const totalCompromisos =
        datos.compromisos.reduce(
            (suma, compromiso) =>
                suma
                +
                compromiso.monto,
            0
        );


    /*
        Proyección de gasto total.

        Gastos variables proyectados
        +
        compromisos mensuales.
    */

    const proyeccionTotal =
        proyeccionVariable
        +
        totalCompromisos;


    /*
        Ahorro estimado al finalizar
        el mes.
    */

    const ahorroProyectado =
        totalIngresos
        -
        proyeccionTotal;


    /*
        ACTUALIZAR INTERFAZ
    */

    document.getElementById(
        "metaAhorroTexto"
    ).textContent =
        formatoDinero(
            metaAhorro
        );


    document.getElementById(
        "disponibleDespuesAhorro"
    ).textContent =
        formatoDinero(
            disponibleDespuesAhorro
        );


    document.getElementById(
        "analisisHormiga"
    ).textContent =
        formatoDinero(
            totalHormiga
        );


    document.getElementById(
        "promedioDiario"
    ).textContent =
        formatoDinero(
            promedioDiario
        );


    document.getElementById(
        "proyeccionMensual"
    ).textContent =
        formatoDinero(
            proyeccionTotal
        );


    document.getElementById(
        "ahorroProyectado"
    ).textContent =
        formatoDinero(
            ahorroProyectado
        );


    /*
        ALERTA AUTOMÁTICA
    */

    const alerta =
        document.getElementById(
            "alertaFinanciera"
        );


    alerta.className =
        "alerta-financiera";


    if (totalIngresos <= 0) {

        alerta.textContent =
            "Ingresa tus ingresos para comenzar el análisis.";

        alerta.classList.add(
            "atencion"
        );

        return;

    }


    if (ahorroProyectado < 0) {

        alerta.textContent =
            "⚠️ Al ritmo actual, tus gastos proyectados superarían tus ingresos este mes.";

        alerta.classList.add(
            "peligro"
        );

    }

    else if (
        metaAhorro > 0
        &&
        ahorroProyectado < metaAhorro
    ) {

        const diferencia =
            metaAhorro
            -
            ahorroProyectado;


        alerta.textContent =
            "🟠 Con tu ritmo actual de gasto, te faltarían "
            +
            formatoDinero(
                diferencia
            )
            +
            " para alcanzar tu meta de ahorro.";


        alerta.classList.add(
            "atencion"
        );

    }

    else if (
        metaAhorro > 0
        &&
        ahorroProyectado >= metaAhorro
    ) {

        alerta.textContent =
            "✓ Manteniendo este ritmo, tu proyección permite alcanzar la meta de ahorro del mes.";

        alerta.classList.add(
            "bien"
        );

    }

    else {

        alerta.textContent =
            "Define una meta de ahorro para comparar tu ritmo de gasto con un objetivo mensual.";

        alerta.classList.add(
            "atencion"
        );

    }

}
/* =========================================================
   TARJETA DE CRÉDITO
   ========================================================= */

function actualizarTarjetaCredito(datos) {
    const gastosTarjeta =
        datos.gastos.filter(
            gasto =>
                !gasto.esFijo
                &&
                gasto.medioPago === "Tarjeta de credito"
        );

    const acumulado =
        gastosTarjeta.reduce(
            (suma, gasto) => suma + Number(gasto.monto || 0),
            0
        );

    const hormigaTarjeta =
        gastosTarjeta
            .filter(gasto => gasto.esHormiga)
            .reduce(
                (suma, gasto) => suma + Number(gasto.monto || 0),
                0
            );

    const transporteTarjeta =
        gastosTarjeta
            .filter(gasto => gasto.categoria === "Transporte")
            .reduce(
                (suma, gasto) => suma + Number(gasto.monto || 0),
                0
            );

    const cupo = Number(configuracionTarjeta.cupo || 0);
    const cupoDisponible = Math.max(cupo - acumulado, 0);

    document.getElementById("tcAcumulado").textContent =
        formatoDinero(acumulado);

    document.getElementById("tcHormiga").textContent =
        formatoDinero(hormigaTarjeta);

    document.getElementById("tcTransporte").textContent =
        formatoDinero(transporteTarjeta);

    document.getElementById("tcCompras").textContent =
        `${gastosTarjeta.length} ${gastosTarjeta.length === 1 ? "compra" : "compras"}`;

    document.getElementById("tcCupoDisponible").textContent =
        cupo > 0 ? formatoDinero(cupoDisponible) : "Sin configurar";

    document.getElementById("tcFacturacion").textContent =
        configuracionTarjeta.diaFacturacion
            ? `Día ${configuracionTarjeta.diaFacturacion}`
            : "Sin configurar";

    const porcentajeCupo =
        cupo > 0 ? acumulado / cupo * 100 : 0;

    document.getElementById("tcBarraProgreso").style.width =
        Math.min(porcentajeCupo, 100) + "%";

    const porcentajeHormiga =
        acumulado > 0 ? hormigaTarjeta / acumulado * 100 : 0;

    document.getElementById("tcResumen").textContent =
        cupo <= 0
            ? "Configura tu cupo y fechas para controlar mejor la tarjeta."
            : `${porcentajeCupo.toFixed(1)}% del cupo utilizado · ${porcentajeHormiga.toFixed(1)}% de lo cargado corresponde a gastos hormiga.`;
}


document.getElementById("btnConfigurarTarjeta").addEventListener(
    "click",
    function () {
        document.getElementById("inputCupoTarjeta").value =
            configuracionTarjeta.cupo || "";
        document.getElementById("inputDiaFacturacion").value =
            configuracionTarjeta.diaFacturacion || "";
        document.getElementById("inputDiaVencimientoTarjeta").value =
            configuracionTarjeta.diaVencimiento || "";
        abrirModal(modalConfiguracion);
    }
);


document.getElementById("btnGuardarTarjeta").addEventListener(
    "click",
    function () {
        const cupo = Number(document.getElementById("inputCupoTarjeta").value);
        const diaFacturacion = Number(document.getElementById("inputDiaFacturacion").value);
        const diaVencimiento = Number(document.getElementById("inputDiaVencimientoTarjeta").value);

        if (!Number.isFinite(cupo) || cupo < 0) {
            alert("Ingresa un cupo válido.");
            return;
        }

        if (diaFacturacion < 1 || diaFacturacion > 31) {
            alert("El día de facturación debe estar entre 1 y 31.");
            return;
        }

        if (diaVencimiento < 1 || diaVencimiento > 31) {
            alert("El día de vencimiento debe estar entre 1 y 31.");
            return;
        }

        configuracionTarjeta = {
            cupo: cupo,
            diaFacturacion: diaFacturacion,
            diaVencimiento: diaVencimiento
        };

        guardarConfiguracionTarjeta();
        cerrarModal(modalConfiguracion);
        actualizarDashboard();
    }
);




/* =========================================================
   V9 - PRESUPUESTOS POR CATEGORÍA
   ========================================================= */

function gastosVariablesPorCategoria(datos) {
    const totales = {};
    datos.gastos
        .filter(gasto => !gasto.esFijo)
        .forEach(gasto => {
            totales[gasto.categoria] =
                (totales[gasto.categoria] || 0)
                + Number(gasto.monto || 0);
        });
    return totales;
}

function actualizarPresupuestos(datos) {
    const contenedor = document.getElementById("listaPresupuestos");
    if (!contenedor) return;

    const presupuestos = configuracionControl.presupuestos || {};
    const activos = CATEGORIAS_V9.filter(
        categoria => Number(presupuestos[categoria] || 0) > 0
    );

    if (activos.length === 0) {
        contenedor.innerHTML =
            '<p class="sin-datos">Aún no has definido presupuestos por categoría.</p>';
        return;
    }

    const gastos = gastosVariablesPorCategoria(datos);
    contenedor.innerHTML = "";

    activos.forEach(categoria => {
        const limite = Number(presupuestos[categoria] || 0);
        const gastado = Number(gastos[categoria] || 0);
        const restante = limite - gastado;
        const porcentaje = limite > 0 ? gastado / limite * 100 : 0;

        const item = document.createElement("div");
        item.className =
            "presupuesto-item "
            + (porcentaje >= 100 ? "excedido" : porcentaje >= 80 ? "alerta" : "");

        item.innerHTML = `
            <div class="presupuesto-cabecera">
                <span>${obtenerIcono(categoria)} ${categoria}</span>
                <strong>${formatoDinero(gastado)} / ${formatoDinero(limite)}</strong>
            </div>
            <div class="presupuesto-progreso">
                <div style="width:${Math.min(porcentaje, 100)}%"></div>
            </div>
            <div class="presupuesto-detalle">
                <span>${porcentaje.toFixed(0)}% utilizado</span>
                <span>${restante >= 0 ? "Quedan " + formatoDinero(restante) : "Exceso " + formatoDinero(Math.abs(restante))}</span>
            </div>
        `;
        contenedor.appendChild(item);
    });
}

function abrirPresupuestos() {
    const contenedor = document.getElementById("camposPresupuestos");
    contenedor.innerHTML = "";

    CATEGORIAS_V9.forEach(categoria => {
        const fila = document.createElement("div");
        fila.className = "campo-presupuesto";
        fila.innerHTML = `
            <label>${obtenerIcono(categoria)} ${categoria}</label>
            <div class="input-dinero">
                <span>$</span>
                <input type="number"
                       data-presupuesto-categoria="${categoria}"
                       value="${Number((configuracionControl.presupuestos || {})[categoria] || 0) || ""}"
                       placeholder="0"
                       inputmode="numeric">
            </div>
        `;
        contenedor.appendChild(fila);
    });

    abrirModal(modalPresupuestos);
}

document.getElementById("btnConfigurarPresupuestos")
    .addEventListener("click", abrirPresupuestos);

document.getElementById("cerrarPresupuestos")
    .addEventListener("click", () => cerrarModal(modalPresupuestos));

document.getElementById("btnGuardarPresupuestos")
    .addEventListener("click", function () {
        const nuevos = {};
        document.querySelectorAll("[data-presupuesto-categoria]")
            .forEach(input => {
                const valor = Number(input.value || 0);
                if (valor > 0) {
                    nuevos[input.dataset.presupuestoCategoria] = valor;
                }
            });

        configuracionControl.presupuestos = nuevos;
        guardarConfiguracionControl();
        cerrarModal(modalPresupuestos);
        actualizarDashboard();
    });


/* =========================================================
   V9 - ALERTAS INTERNAS
   ========================================================= */

function actualizarAlertasInternas(datos, totalIngresos, totalGastos, compromisosPendientes) {
    const contenedor = document.getElementById("listaAlertasInternas");
    if (!contenedor) return;

    const alertas = [];
    const gastos = gastosVariablesPorCategoria(datos);
    const presupuestos = configuracionControl.presupuestos || {};

    Object.entries(presupuestos).forEach(([categoria, limite]) => {
        limite = Number(limite || 0);
        const gastado = Number(gastos[categoria] || 0);
        if (limite <= 0) return;

        const pct = gastado / limite * 100;
        if (pct >= 100) {
            alertas.push({
                tipo: "peligro",
                texto: `🚨 ${categoria}: superaste el presupuesto en ${formatoDinero(gastado - limite)}.`
            });
        } else if (pct >= 80) {
            alertas.push({
                tipo: "atencion",
                texto: `⚠️ ${categoria}: ya utilizaste ${pct.toFixed(0)}% de tu presupuesto.`
            });
        }
    });

    const hormiga = datos.gastos
        .filter(g => g.esHormiga)
        .reduce((s, g) => s + Number(g.monto || 0), 0);

    if (totalIngresos > 0 && hormiga / totalIngresos >= 0.05) {
        alertas.push({
            tipo: "atencion",
            texto: `🐜 Tus gastos hormiga equivalen al ${(hormiga / totalIngresos * 100).toFixed(1)}% de tus ingresos del mes.`
        });
    }

    const aportes = totalAportesAhorroMes(datos);
    const libre = totalIngresos - totalGastos - compromisosPendientes - aportes;
    if (totalIngresos > 0 && libre < 0) {
        alertas.push({
            tipo: "peligro",
            texto: `💸 Gastos, compromisos y ahorro reservado superan tus ingresos en ${formatoDinero(Math.abs(libre))}.`
        });
    }

    if (alertas.length === 0) {
        alertas.push({
            tipo: "bien",
            texto: "✓ No hay alertas importantes con los datos registrados este mes."
        });
    }

    contenedor.innerHTML = alertas
        .map(a => `<div class="alerta-interna ${a.tipo}">${a.texto}</div>`)
        .join("");
}


/* =========================================================
   V9 - METAS DE AHORRO Y DESCUENTO AUTOMÁTICO
   ========================================================= */

function aplicarAhorroAutomaticoIngresoExtra(datos, ingreso) {
    asegurarAportesAhorro(datos);

    metasAhorroV9.forEach(meta => {
        const porcentaje = Number(meta.porcentajeExtra || 0);
        if (porcentaje <= 0) return;

        const monto = Math.round(Number(ingreso.monto || 0) * porcentaje / 100);
        if (monto <= 0) return;

        datos.aportesAhorro.push({
            id: generarId(),
            metaId: meta.id,
            ingresoId: ingreso.id,
            monto: monto,
            fecha: ingreso.fecha,
            automatico: true
        });
    });
}

function totalAhorradoMeta(meta, datosMesActual) {
    let total = Number(meta.montoInicial || 0);

    Object.values(datosFinancieros).forEach(datos => {
        if (!Array.isArray(datos.aportesAhorro)) return;
        total += datos.aportesAhorro
            .filter(aporte => aporte.metaId === meta.id)
            .reduce((suma, aporte) => suma + Number(aporte.monto || 0), 0);
    });

    return total;
}

function actualizarMetasAhorroV9(datos) {
    const lista = document.getElementById("listaMetasAhorroV9");
    const resumen = document.getElementById("resumenAhorroV9");
    if (!lista || !resumen) return;

    const aportadoMes = totalAportesAhorroMes(datos);
    const totalAcumulado = metasAhorroV9.reduce(
        (suma, meta) => suma + totalAhorradoMeta(meta, datos),
        0
    );

    resumen.innerHTML = `
        <span>Reservado automáticamente este mes</span>
        <strong>${formatoDinero(aportadoMes)}</strong>
        <p>${formatoDinero(totalAcumulado)} acumulado entre todas tus metas.</p>
    `;

    if (metasAhorroV9.length === 0) {
        lista.innerHTML =
            '<p class="sin-datos">Crea tu primera meta para comenzar a separar parte de tus ingresos extra.</p>';
        return;
    }

    lista.innerHTML = "";

    metasAhorroV9.forEach(meta => {
        const ahorrado = totalAhorradoMeta(meta, datos);
        const objetivo = Number(meta.objetivo || 0);
        const pct = objetivo > 0 ? ahorrado / objetivo * 100 : 0;
        const falta = Math.max(objetivo - ahorrado, 0);

        const card = document.createElement("div");
        card.className = "meta-v9-card";
        card.innerHTML = `
            <div class="meta-v9-top">
                <strong>🎯 ${meta.nombre}</strong>
                <span>${Math.min(pct, 100).toFixed(0)}%</span>
            </div>
            <div class="meta-v9-valores">
                <span>${formatoDinero(ahorrado)} ahorrado</span>
                <span>Faltan ${formatoDinero(falta)}</span>
            </div>
            <div class="meta-v9-barra">
                <div style="width:${Math.min(pct, 100)}%"></div>
            </div>
            <div class="meta-v9-regla">
                ${Number(meta.porcentajeExtra || 0)}% de cada ingreso extra → esta meta
            </div>
        `;
        card.addEventListener("click", () => abrirMetaAhorroV9(meta.id));
        lista.appendChild(card);
    });
}

function abrirMetaAhorroV9(id = null) {
    metaAhorroV9EnEdicion = id;

    const meta = id
        ? metasAhorroV9.find(item => item.id === id)
        : null;

    document.getElementById("tituloMetaAhorroV9").textContent =
        meta ? "Editar meta de ahorro" : "Nueva meta de ahorro";
    document.getElementById("nombreMetaAhorroV9").value =
        meta ? meta.nombre : "";
    document.getElementById("objetivoMetaAhorroV9").value =
        meta ? meta.objetivo : "";
    document.getElementById("inicialMetaAhorroV9").value =
        meta ? meta.montoInicial : "";
    document.getElementById("porcentajeMetaAhorroV9").value =
        meta ? meta.porcentajeExtra : "";
    document.getElementById("btnEliminarMetaAhorroV9").style.display =
        meta ? "block" : "none";

    abrirModal(modalMetaAhorroV9);
}

document.getElementById("btnNuevaMetaAhorroV9")
    .addEventListener("click", () => abrirMetaAhorroV9());

document.getElementById("cerrarMetaAhorroV9")
    .addEventListener("click", () => cerrarModal(modalMetaAhorroV9));

document.getElementById("btnGuardarMetaAhorroV9")
    .addEventListener("click", function () {
        const nombre =
            document.getElementById("nombreMetaAhorroV9").value.trim();
        const objetivo =
            Number(document.getElementById("objetivoMetaAhorroV9").value);
        const montoInicial =
            Number(document.getElementById("inicialMetaAhorroV9").value || 0);
        const porcentajeExtra =
            Number(document.getElementById("porcentajeMetaAhorroV9").value || 0);

        if (!nombre || objetivo <= 0 || montoInicial < 0 ||
            porcentajeExtra < 0 || porcentajeExtra > 100) {
            alert("Revisa los datos de la meta.");
            return;
        }

        const otrosPorcentajes = metasAhorroV9
            .filter(meta => meta.id !== metaAhorroV9EnEdicion)
            .reduce((suma, meta) => suma + Number(meta.porcentajeExtra || 0), 0);

        if (otrosPorcentajes + porcentajeExtra > 100) {
            alert(
                `Los porcentajes de ahorro suman ${otrosPorcentajes + porcentajeExtra}%. El máximo entre todas las metas es 100%.`
            );
            return;
        }

        if (metaAhorroV9EnEdicion) {
            const meta = metasAhorroV9.find(
                item => item.id === metaAhorroV9EnEdicion
            );
            if (!meta) return;
            meta.nombre = nombre;
            meta.objetivo = objetivo;
            meta.montoInicial = montoInicial;
            meta.porcentajeExtra = porcentajeExtra;
        } else {
            metasAhorroV9.push({
                id: generarId(),
                nombre,
                objetivo,
                montoInicial,
                porcentajeExtra,
                fechaCreacion: new Date().toISOString()
            });
        }

        guardarMetasAhorroV9();
        cerrarModal(modalMetaAhorroV9);
        actualizarDashboard();
    });

document.getElementById("btnEliminarMetaAhorroV9")
    .addEventListener("click", function () {
        if (!metaAhorroV9EnEdicion) return;

        const meta = metasAhorroV9.find(
            item => item.id === metaAhorroV9EnEdicion
        );
        if (!meta) return;

        if (!confirm(`¿Eliminar la meta "${meta.nombre}"? Los aportes históricos asociados dejarán de mostrarse en una meta.`)) {
            return;
        }

        metasAhorroV9 = metasAhorroV9.filter(
            item => item.id !== metaAhorroV9EnEdicion
        );
        guardarMetasAhorroV9();
        metaAhorroV9EnEdicion = null;
        cerrarModal(modalMetaAhorroV9);
        actualizarDashboard();
    });



/* =========================================================
   V9.1 - RESPALDO PORTABLE
   ========================================================= */
const CLAVES_RESPALDO = [
    "datosFinancieros", "gastosFijos", "configuracionTarjeta",
    "configuracionControl", "metasAhorroV9"
];

function actualizarEstadoBackup() {
    const estado = document.getElementById("estadoBackup");
    if (!estado) return;
    const fecha = localStorage.getItem("ultimoBackupControlFinanciero");
    estado.textContent = fecha
        ? "Último respaldo creado: " + new Date(fecha).toLocaleString("es-CL")
        : "Aún no se ha creado un respaldo desde esta versión.";
}

function crearObjetoBackup() {
    const contenido = {};
    CLAVES_RESPALDO.forEach(clave => {
        const valor = localStorage.getItem(clave);
        if (valor !== null) {
            try { contenido[clave] = JSON.parse(valor); }
            catch { contenido[clave] = valor; }
        }
    });
    return {
        app: "Control Financiero",
        version: "9.1",
        formato: 1,
        fechaRespaldo: new Date().toISOString(),
        contenido
    };
}

async function exportarBackup() {
    const respaldo = crearObjetoBackup();
    const blob = new Blob(
        [JSON.stringify(respaldo, null, 2)],
        {type:"application/json"}
    );
    const fecha = new Date().toISOString().slice(0,10);
    const nombre = `control-financiero-backup-${fecha}.json`;
    const archivo = new File([blob], nombre, {type:"application/json"});

    try {
        if (navigator.share && navigator.canShare &&
            navigator.canShare({files:[archivo]})) {
            await navigator.share({
                files:[archivo],
                title:"Respaldo Control Financiero"
            });
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = nombre;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        localStorage.setItem(
            "ultimoBackupControlFinanciero",
            respaldo.fechaRespaldo
        );
        actualizarEstadoBackup();
    } catch (error) {
        if (error.name !== "AbortError") {
            alert("No fue posible crear el respaldo.");
        }
    }
}

async function restaurarBackupDesdeArchivo(archivo) {
    try {
        const respaldo = JSON.parse(await archivo.text());
        if (!respaldo || respaldo.app !== "Control Financiero" ||
            !respaldo.contenido) {
            alert("Este archivo no es un respaldo válido de Control Financiero.");
            return;
        }
        if (!confirm("Se reemplazarán los datos actuales por los del respaldo. ¿Continuar?")) return;

        CLAVES_RESPALDO.forEach(clave => {
            if (Object.prototype.hasOwnProperty.call(respaldo.contenido, clave)) {
                localStorage.setItem(clave, JSON.stringify(respaldo.contenido[clave]));
            } else {
                localStorage.removeItem(clave);
            }
        });
        localStorage.setItem(
            "ultimoBackupControlFinanciero",
            respaldo.fechaRespaldo || new Date().toISOString()
        );
        alert("Respaldo restaurado correctamente.");
        location.reload();
    } catch {
        alert("No fue posible leer el archivo de respaldo.");
    }
}

document.getElementById("btnExportarBackup").addEventListener("click", exportarBackup);
document.getElementById("btnImportarBackup").addEventListener("click", () => {
    document.getElementById("inputImportarBackup").click();
});
document.getElementById("inputImportarBackup").addEventListener("change", function () {
    if (this.files && this.files[0]) restaurarBackupDesdeArchivo(this.files[0]);
    this.value = "";
});
actualizarEstadoBackup();


/* =========================================================
   V8 - NAVEGACIÓN PRINCIPAL
   ========================================================= */

let vistaActual = "inicio";

function cambiarVista(nombreVista) {
    const vistas = document.querySelectorAll(".vista-app");
    const botones = document.querySelectorAll(".nav-item");

    vistas.forEach(vista => {
        vista.classList.toggle(
            "activa",
            vista.dataset.vista === nombreVista
        );
    });

    botones.forEach(boton => {
        boton.classList.toggle(
            "activo",
            boton.dataset.vistaDestino === nombreVista
        );
    });

    vistaActual = nombreVista;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-item").forEach(boton => {
    boton.addEventListener("click", function () {
        cambiarVista(this.dataset.vistaDestino);
    });
});

document.querySelectorAll("[data-ir-vista]").forEach(boton => {
    boton.addEventListener("click", function () {
        cambiarVista(this.dataset.irVista);
    });
});


function actualizarResumenInicio(
    totalIngresos,
    totalGastos,
    compromisosPendientes,
    disponible
) {
    const elemento = document.getElementById("resumenInicioTexto");
    if (!elemento) return;

    if (totalIngresos <= 0) {
        elemento.textContent =
            "Configura tu sueldo o registra un ingreso para comenzar a controlar el mes.";
        return;
    }

    const comprometido = totalGastos + compromisosPendientes;
    const porcentaje = totalIngresos > 0
        ? comprometido / totalIngresos * 100
        : 0;

    if (disponible < 0) {
        elemento.textContent =
            `Tus gastos y compromisos superan tus ingresos en ${formatoDinero(Math.abs(disponible))}.`;
    } else if (porcentaje >= 80) {
        elemento.textContent =
            `Tienes ${formatoDinero(disponible)} disponible y ya está comprometido el ${porcentaje.toFixed(0)}% de tus ingresos.`;
    } else {
        elemento.textContent =
            `Tienes ${formatoDinero(disponible)} disponible. El ${porcentaje.toFixed(0)}% de tus ingresos está gastado o comprometido.`;
    }
}


function actualizarCategoriasTarjeta(datos) {
    const contenedor =
        document.getElementById("resumenTarjetaCategorias");

    if (!contenedor) return;

    const gastosTarjeta =
        datos.gastos.filter(
            gasto =>
                !gasto.esFijo
                &&
                gasto.medioPago === "Tarjeta de credito"
        );

    contenedor.innerHTML = "";

    if (gastosTarjeta.length === 0) {
        contenedor.innerHTML =
            '<p class="sin-datos">Todavía no hay compras con tarjeta este mes.</p>';
        return;
    }

    const categorias = {};
    gastosTarjeta.forEach(gasto => {
        categorias[gasto.categoria] =
            (categorias[gasto.categoria] || 0)
            + Number(gasto.monto || 0);
    });

    const total = gastosTarjeta.reduce(
        (suma, gasto) => suma + Number(gasto.monto || 0),
        0
    );

    Object.entries(categorias)
        .sort((a, b) => b[1] - a[1])
        .forEach(([categoria, monto]) => {
            const porcentaje =
                total > 0 ? monto / total * 100 : 0;

            const elemento = document.createElement("div");
            elemento.className = "categoria-item";
            elemento.innerHTML = `
                <div class="categoria-superior">
                    <span>${obtenerIcono(categoria)} ${categoria}</span>
                    <strong>${formatoDinero(monto)}</strong>
                </div>
                <div class="categoria-barra">
                    <div class="categoria-progreso"
                         style="width:${porcentaje}%"></div>
                </div>
            `;
            contenedor.appendChild(elemento);
        });
}


/* =========================================================
   28. DASHBOARD
   ========================================================= */

function actualizarDashboard() {

    actualizarNombreMes();


    const datos =
        obtenerDatosMes();


    /*
        TOTAL INGRESOS
    */

    const totalIngresos =
        datos.ingresos.reduce(
            (suma, ingreso) =>
                suma + ingreso.monto,
            0
        );


    /*
        GASTOS YA PAGADOS / REALIZADOS
    */

    const totalGastos =
        datos.gastos.reduce(
            (suma, gasto) =>
                suma + gasto.monto,
            0
        );


    /*
        COMPROMISOS QUE AÚN NO
        HAN SIDO PAGADOS
    */

    const compromisosPendientes =
        datos.compromisos
            .filter(
                compromiso =>
                    !compromiso.pagado
            )
            .reduce(
                (suma, compromiso) =>
                    suma
                    +
                    compromiso.monto,
                0
            );


    /*
        DISPONIBLE REAL

        Ingresos
        -
        gastos realizados
        -
        compromisos pendientes
    */

    const ahorroAutomaticoMes =
        totalAportesAhorroMes(datos);


    const disponible =
        totalIngresos
        -
        totalGastos
        -
        compromisosPendientes
        -
        ahorroAutomaticoMes;


    const dineroComprometido =
        totalGastos
        +
        compromisosPendientes
        +
        ahorroAutomaticoMes;


    let porcentaje = 0;


    if (totalIngresos > 0) {

        porcentaje =
            dineroComprometido
            /
            totalIngresos
            *
            100;
    }


    document.getElementById(
        "totalIngresos"
    ).textContent =
        formatoDinero(
            totalIngresos
        );


    document.getElementById(
        "totalGastos"
    ).textContent =
        formatoDinero(
            totalGastos
        );


    document.getElementById(
        "saldoDisponible"
    ).textContent =
        formatoDinero(
            disponible
        );


    document.getElementById(
        "porcentajeGastado"
    ).textContent =
        porcentaje.toFixed(1)
        +
        "% del ingreso comprometido";


    document.getElementById(
        "barraProgreso"
    ).style.width =
        Math.min(
            porcentaje,
            100
        )
        +
        "%";


    actualizarCompromisos(
        datos
    );


    mostrarCompromisos(
        datos
    );


    actualizarHormiga(
        datos
    );


    mostrarCategorias(
        datos
    );


    mostrarMovimientos(
        datos
    );


    actualizarTarjetaCredito(
        datos
    );


    actualizarCategoriasTarjeta(
        datos
    );


    actualizarResumenInicio(
        totalIngresos,
        totalGastos,
        compromisosPendientes,
        disponible
    );


    actualizarPresupuestos(
        datos
    );


    actualizarAlertasInternas(
        datos,
        totalIngresos,
        totalGastos,
        compromisosPendientes
    );


    actualizarMetasAhorroV9(
        datos
    );


    actualizarAnalisisFinanciero(
        datos,
        totalIngresos,
        totalGastos,
        compromisosPendientes
    );
}


/* =========================================================
   29. CERRAR MODALES TOCANDO EL FONDO
   ========================================================= */

[
    modalMovimiento,
    modalGasto,
    modalIngreso,
    modalConfiguracion,
    modalFijo,
    modalEditar,
    modalMetaAhorro,
    modalPresupuestos,
    modalMetaAhorroV9


].forEach(
    modal => {

        modal.addEventListener(
            "click",
            function (evento) {

                if (
                    evento.target
                    === modal
                ) {

                    cerrarModal(
                        modal
                    );
                }
            }
        );
    }
);


/* =========================================================
   30. INICIAR
   ========================================================= */

actualizarDashboard();