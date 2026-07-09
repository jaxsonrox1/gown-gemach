const Calendar = {
    currentDate: new Date(),
    selectedDateStr: null,

    init() {
        this.render();
    },

    changeMonth(offset) {
        this.currentDate.setMonth(this.currentDate.getMonth() + offset);
        this.render();
    },

    formatDateStr(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;

        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        // Inject the Weekday headers dynamically
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbos'];
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'weekday-header';
            header.textContent = day;
            grid.appendChild(header);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for(let i = 0; i < firstDay; i++) {
            const pad = document.createElement('div');
            pad.className = 'calendar-day empty';
            grid.appendChild(pad);
        }

        const todayStr = this.formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

        for(let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.formatDateStr(year, month, day);
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            
            if (dateStr === todayStr) dayEl.classList.add('today');
            if (dateStr === this.selectedDateStr) dayEl.classList.add('selected');

            dayEl.innerHTML = `<div class="day-number">${day}</div>`;
            dayEl.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
                dayEl.classList.add('selected');
                this.selectedDateStr = dateStr;
                UI.renderSidebar(dateStr);
            });

            this.appendDayBadges(dateStr, dayEl);
            grid.appendChild(dayEl);
        }
    },

    appendDayBadges(dateStr, dayEl) {
        State.data.transactions.filter(t => t.cleaningDate === dateStr).forEach(t => {
            const g = State.getGown(t.gownId);
            dayEl.innerHTML += `<div class="badge clean">Clean: ${g ? g.id : 'Unknown'}</div>`;
        });

        State.data.transactions.filter(t => t.lendDate === dateStr).forEach(t => {
            const g = State.getGown(t.gownId);
            dayEl.innerHTML += `<div class="badge lend">Lend: ${g ? g.id : 'Unknown'}</div>`;
        });

        State.data.events.filter(e => e.date === dateStr).forEach(e => {
            dayEl.innerHTML += `<div class="badge event">Memo: ${e.title}</div>`;
        });
    }
};